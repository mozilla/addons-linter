import { _parse as parseFluent } from 'fluent';

import * as messages from 'messages';


export default class FluentParser {
  /*
   * Parse FTL files (https://projectfluent.io)
   * We are using FTL files in our language packs to specify translations.
   *
   */

  constructor(source, collector, { filename = null } = {}) {
    this._sourceString = source;

    this.collector = collector;
    this.filename = filename;
    this.isValid = null;
  }

  parse() {
    const [entries, errors] = parseFluent(this._sourceString);
    this.parsedData = {};

    Object.entries(entries).forEach(([id, entry]) => {
      this.parsedData[id] = entry;
    });

    if (errors.length) {
      this.isValid = false;

      errors.forEach((error) => {
        // We only have the message being passed down from fluent, unfortunately
        // it doesn't log any line numbers or columns.
        const errorData = {
          ...messages.FLUENT_INVALID,
          file: this.filename,
          // normalize newlines and flatten the message a bit.
          description: error.message.replace(/(?:\n(?:\s*))+/g, ' '),
        };

        this.collector.addError(errorData);
      });
    }

    if (this.isValid !== false) {
      this.isValid = true;
    }
  }
}
