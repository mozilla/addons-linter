import * as esprima from 'esprima';
import RJSON from '@fregante/relaxed-json';

import * as messages from 'messages';

export default class JSONParser {
  constructor(jsonString, collector, addonMetadata, { filename = null } = {}) {
    // Add the JSON string to the object; we'll use this for testing.
    this._jsonString = jsonString;

    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;

    // Set the filename for this file
    this.filename = filename;

    // This marks whether a JSON file is valid; in the case of the base JSON
    // parser, that's just whether it can be parsed and has duplicate keys.
    this.isValid = null;

    // Provides access to addon information from scanners
    this.addonMetadata = addonMetadata;
  }

  parse(RelaxedJSON = RJSON) {
    try {
      this.parsedJSON = JSON.parse(this._jsonString);
    } catch {
      // First we'll try to remove comments with esprima;
      // WebExtension manifests can contain comments, so we'll strip
      // them out and see if we can parse the JSON.
      // If not it's just garbage JSON and we error.
      //
      // Originally from https://github.com/abarreir/crx2ff/blob/d2b882056f902d751ad05e329efda7eddcb9d268/libs/ext-converter.js#L19-L37
      const manifestString = `var o = ${this._jsonString}`;
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
        const tokens = esprima
          .tokenize(manifestString, { comment: true })
          .slice(3);
        this._jsonString = tokens.reduce((json, token) => {
          // Ignore line comments (`// comments`) and just return the existing
          // json we've built.
          if (token.type === 'LineComment') {
            return json;
          }

          // Block comments are not allowed, so this is an error.
          if (token.type === 'BlockComment') {
            this.collector.addError(messages.JSON_BLOCK_COMMENTS);
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
        const errorData = {
          ...messages.JSON_INVALID,
          file: this.filename,
          description: error.message,
        };
        this.collector.addError(errorData);
        this.isValid = false;
        return;
      }
    }

    // Check for duplicate keys, which renders the manifest invalid.
    this._checkForDuplicateKeys(RelaxedJSON);

    // If never marked as invalid, this is a valid JSON file.
    if (this.isValid !== false) {
      this.isValid = true;
    }
  }

  _checkForDuplicateKeys(RelaxedJSON = RJSON) {
    try {
      RelaxedJSON.parse(this._jsonString, { duplicate: true, tolerant: true });
    } catch (err) {
      if (err.warnings && err.warnings.length > 0) {
        err.warnings.forEach((error) => {
          if (error.message.startsWith('Duplicate key:')) {
            const message = {
              ...messages.JSON_DUPLICATE_KEY,
              file: this.filename,
              line: error.line,
              description: `${error.message} found in JSON`,
            };
            this.collector.addError(message);
            this.isValid = false;
          }
        });
      }
    }
  }
}
