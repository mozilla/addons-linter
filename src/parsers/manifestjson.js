import { PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import validate from 'mozilla-web-extension-manifest-schema';
import * as messages from 'messages';
import cli from 'cli';

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
    var result = {
      code: 'MANIFEST_JSON_INVALID',
      description: 'MANIFEST_ERROR',
      file: 'manifest.json',
      level: 'error',
      message: `${error.dataPath}: ${error.message}`,
    };

    if (error.keyword == 'required') {
      result.description = `MANIFEST_FIELD_REQUIRED`;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane.
    var array_regex = /^\/(permissions)\/([\d+])/;
    var array_match = error.dataPath.match(array_regex);
    if (array_match) {
      result.message = `/${array_match[1]}: Unknown ${array_match[1]} value "${error.data}" at entry ${array_match[2]}.`;
      result.description = `MANIFEST_UNKNOWN_${array_match[1].toUpperCase()}`;
      result.level = 'warning';
    }
    return result;
  }

  _validate() {
    var isValid = validate(this.parsedJSON);
    if (!isValid) {
      log.debug('Schema Validation errors', validate.errors);
      var errorsFound = [];
      for (let error of validate.errors) {
        if (errorsFound.indexOf(error.dataPath) > -1) {
            continue;
        }

        var errorData = this.errorLookup(error);
        errorsFound.push(error.dataPath);
        if (errorData.level == 'warning') {
          this.collector.addWarning(errorData);
        } else {
          this.collector.addError(errorData);
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

  getMetadata() {
    return {
      manifestVersion: this.parsedJSON.manifest_version,
      name: this.parsedJSON.name,
      type: PACKAGE_EXTENSION,
      version: this.parsedJSON.version,
    };
  }
}
