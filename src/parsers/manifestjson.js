import { PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import validate from 'mozilla-web-extension-manifest-schema';
import * as messages from 'messages';
import cli from 'cli';
import { singleLineString } from 'utils';

export default class ManifestJSONParser {

  constructor(jsonString, collector, {selfHosted=cli.argv.selfHosted}={}) {
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
      this.parsedJSON = JSON.parse(jsonString);
    } catch (error) {
      var errorData = {
        code: 'MANIFEST_JSON_INVALID',
        message: 'Invalid JSON in manifest file.',
        file: 'manifest.json',
        description: error,
      };
      this.collector.addError(errorData);
      this.isValid = false;
      return;
    }

    this.selfHosted = selfHosted;
    this.isValid = this._validate();
  }

  errorLookup(error) {
    // This is the default message.
    var baseObject = messages.MANIFEST_JSON_INVALID;
    var overrides = {
      message: `${error.dataPath} ${error.message}`,
    };

    if (error.keyword === 'required') {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    var match = error.dataPath.match(/^\/(permissions)\/([\d+])/);
    if (match) {
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
      }
    }

    if (this.parsedJSON.content_security_policy) {
      this.collector.addWarning(messages.MANIFEST_CSP);
    }

    if (!this.selfHosted && this.parsedJSON.hasOwnProperty('update_url')) {
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
      console.log('Failed to get the id from the manifest.');
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
