import { PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import validate from 'mozilla-web-extension-manifest-schema';


export default class ManifestJSONParser {

  constructor(jsonString, collector) {
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

    this.isValid = this._validate();
  }

  _validate() {
    var isValid = validate(this.parsedJSON);
    if (!isValid) {
      log.debug('Schema Validation errors', validate.errors);
      for (let error of validate.errors) {
        var description;
        var errorData = {
          code: 'MANIFEST_JSON_INVALID',
          message: `${error.dataPath}: ${error.message}`,
          file: 'manifest.json',
        };

        // If a required prop is missing, introspect the schema for its
        // description.
        if (error.keyword === 'required') {
          description = error.schema[error.params.missingProperty].description;
        } else {
          description = error.parentSchema.description;
        }

        errorData.description = description || 'MISSING_SCHEMA_DESCRIPTION';
        this.collector.addError(errorData);
      }
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
