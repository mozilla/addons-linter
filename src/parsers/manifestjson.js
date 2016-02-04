import { PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import validate from 'mozilla-web-extension-manifest-schema';


export default class ManifestJSONParser {

  constructor(jsonString, collector) {
    this.parsedJSON = JSON.parse(jsonString);
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
  }

  checkSchema() {
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
    var isValid = this.checkSchema();
    return {
      isValid: isValid,
      metadata: {
        manifestVersion: this.parsedJSON.manifest_version,
        name: this.parsedJSON.name,
        type: PACKAGE_EXTENSION,
        version: this.parsedJSON.version,
      },
    };
  }
}
