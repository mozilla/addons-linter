import esprima from 'esprima';
import validate from 'schema/validator';

import cli from 'cli';
import { PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import * as messages from 'messages';
import { singleLineString } from 'utils';

export default class ManifestJSONParser {

  constructor(jsonString, collector, {selfHosted=cli.argv.selfHosted}={}) {
    // Add the JSON string to the object; we'll use this for testing.
    this._jsonString = jsonString;

    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;

    // Set up some defaults in case parsing fails.
    this.parsedJSON = {
      manifestVersion: null,
      name: null,
      type: PACKAGE_EXTENSION,
      version: null,
    };

    try {
      this.parsedJSON = JSON.parse(this._jsonString);
    } catch (originalError) {
      // First we'll try to remove comments with esprima;
      // WebExtension manifests can contain comments, so we'll strip
      // them out and see if we can parse the JSON.
      // If not it's just garbage JSON and we error.
      //
      // Originally from https://github.com/abarreir/crx2ff/blob/d2b882056f902d751ad05e329efda7eddcb9d268/libs/ext-converter.js#L19-L37
      var manifestString = `var o = ${jsonString}`;
      try {
        // This converts the JSON into a real JS object, and removes any
        // comments from the JS code.
        // This has some drawbacks because JSON and JS are not _100%_
        // compatible. This is largely to do with Unicode characters we
        // wouldn't expect to see in manifests anyway, and it should simply be
        // a JSON parse error anyway.
        // See:
        // http://stackoverflow.com/questions/23752156/are-all-json-objects-also-valid-javascript-objects/23753148#23753148
        // https://github.com/judofyr/timeless/issues/57#issuecomment-31872462
        var tokens = esprima.tokenize(manifestString, {comment: true}).slice(3);
        this._jsonString = tokens.reduce((json, token) => {
          // Ignore line comments (`// comments`) and just return the existing
          // json we've built.
          if (token.type === 'LineComment') {
            return json;
          }

          // Block comments are not allowed, so this is an error.
          if (token.type === 'BlockComment') {
            this.collector.addError(messages.MANIFEST_BLOCK_COMMENTS);
            this.isValid = false;
          }

          return `${json}${token.value}`;
        }, '');

        // We found block-level comments, so this manifest is not valid.
        // Don't bother parsing it again.
        if (this.isValid === false) {
          return;
        }

        this.parsedJSON = JSON.parse(this._jsonString);
      } catch (error) {
        // There was still an error, so looks like this manifest is actually
        // invalid.
        var errorData = {
          code: messages.MANIFEST_JSON_INVALID.code,
          message: 'Invalid JSON in manifest file.',
          file: 'manifest.json',
          description: error,
        };
        this.collector.addError(errorData);
        this.isValid = false;
        return;
      }
    }

    this.selfHosted = selfHosted;
    this.isValid = this._validate();
  }

  errorLookup(error) {
    // This is the default message.
    var baseObject = messages.MANIFEST_JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      let lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should not have additional properties') {
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    var overrides = {
      message: `"${error.dataPath}" ${error.message}`,
    };

    if (error.keyword === 'required') {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.dataPath.startsWith('/permissions') &&
               typeof error.data !== 'undefined' &&
               typeof error.data !== 'string') {
      // Check for non-strings in the manifest permissions; these indicate
      // a Chrome app extension. This means an error.
      baseObject = messages.MANIFEST_BAD_PERMISSION;
      overrides = {};
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    var match = error.dataPath.match(/^\/(permissions)\/([\d+])/);
    if (match && baseObject.code !== messages.MANIFEST_BAD_PERMISSION.code) {
      baseObject = messages[`MANIFEST_${match[1].toUpperCase()}`];
      overrides.message = singleLineString`/${match[1]}: Unknown ${match[1]}
          "${error.data}" at ${match[2]}.`;
    }

    return Object.assign({}, baseObject, overrides);
  }

  _validate() {
    // Not all messages returned by the schema are fatal to Firefox, messages
    // that are just warnings should be added to this array.
    var warnings = [messages.MANIFEST_PERMISSIONS.code];

    var isValid = validate(this.parsedJSON);
    if (!isValid) {
      log.debug('Schema Validation messages', validate.errors);
      var errorsFound = [];

      for (let error of validate.errors) {
        // Ensure that we only add one error on a field. This runs the risk
        // of hiding errors, but means that we can aim to get to a more
        // helpful error in the case of some rather verbose schema errors.
        if (errorsFound.indexOf(error.dataPath) > -1) {
          continue;
        }

        var message = this.errorLookup(error);
        errorsFound.push(error.dataPath);

        if (warnings.includes(message.code)) {
          this.collector.addWarning(message);
        } else {
          this.collector.addError(message);
        }

        // Add-ons with bad permissions will fail to install in Firefox, so
        // we consider them invalid.
        if (message.code === messages.MANIFEST_BAD_PERMISSION.code) {
          isValid = false;
        }
      }
    }

    if (this.parsedJSON.content_security_policy) {
      this.collector.addWarning(messages.MANIFEST_CSP);
    }

    if (this.parsedJSON.update_url) {
      this.collector.addNotice(messages.MANIFEST_UNUSED_UPDATE);
    }

    if (!this.selfHosted && this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.update_url) {
      this.collector.addError(messages.MANIFEST_UPDATE_URL);
      isValid = false;
    }

    return isValid;
  }

  getAddonId() {
    try {
      var id = this.parsedJSON.applications.gecko.id;
      return typeof id === 'undefined' ? null : id;
    } catch (e) {
      log.error('Failed to get the id from the manifest.');
      return null;
    }
  }

  getMetadata() {
    return {
      id: this.getAddonId(),
      manifestVersion: this.parsedJSON.manifest_version,
      name: this.parsedJSON.name,
      type: PACKAGE_EXTENSION,
      version: this.parsedJSON.version,
    };
  }
}
