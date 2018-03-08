// Use compat build for node6 compatibility
import { FluentParser as FluentSyntaxParser } from 'fluent-syntax/compat';

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

  getLineAndColumnFromSpan(span) {
    const matchedLines = this._sourceString
      .substr(0, span.end)
      .split('\n');

    const matchedColumn = matchedLines.slice('-1')[0].length + 1;
    const matchedLine = matchedLines.length;

    return { matchedLine, matchedColumn };
  }

  parse() {
    const parser = new FluentSyntaxParser();
    const resource = parser.parse(this._sourceString);

    this.parsedData = {};

    resource.body.forEach((entry) => {
      if (entry.type === 'Junk') {
        this.isValid = false;

        // There is always just one annotation for a junk entry
        const annotation = entry.annotations[0];

        const {
          matchedLine,
          matchedColumn } = this.getLineAndColumnFromSpan(annotation.span);

        const errorData = {
          ...messages.FLUENT_INVALID,
          file: this.filename,
          description: entry.annotations[0].message,
          column: matchedColumn,
          line: matchedLine,
        };

        this.collector.addError(errorData);
      } else if (entry.id !== undefined) {
        this.parsedData[entry.id.name] = entry;
      }
    });

    if (this.isValid !== false) {
      this.isValid = true;
    }
  }
}
