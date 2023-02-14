import { parse, lineOffset, columnOffset } from '@fluent/syntax';

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
    const resource = parse(this._sourceString);

    this.parsedData = {};

    resource.body.forEach((entry) => {
      if (entry.type === 'Junk') {
        this.isValid = false;

        // There is always just one annotation for a junk entry
        const annotation = entry.annotations[0];
        const matchedLine =
          lineOffset(this._sourceString, annotation.span.end) + 1;
        const matchedColumn = columnOffset(
          this._sourceString,
          annotation.span.end
        );

        const warningData = {
          ...messages.FLUENT_INVALID,
          file: this.filename,
          description: entry.annotations[0].message,
          column: matchedColumn,
          line: matchedLine,
        };

        this.collector.addWarning(warningData);
      } else if (entry.id !== undefined) {
        this.parsedData[entry.id.name] = entry;
      }
    });

    if (this.isValid !== false) {
      this.isValid = true;
    }
  }
}
