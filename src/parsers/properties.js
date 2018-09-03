export default class PropertiesParser {
  /*
   * Parser for .properties files.
   * We are using .properties files in our language packs to specify
   * translations.
   *
   * See http://bit.ly/2xTdYgY (Properties File Format Specification) for
   * more details.
   */

  constructor(propertiesString, collector, { filename = null } = {}) {
    this._propertiesString = propertiesString;

    this.collector = collector;
    this.filename = filename;
    this.isValid = null;
  }

  parse() {
    this.parsedData = {};

    const lines = this._propertiesString.split('\n');

    let lineBuffer = null;

    lines.forEach((line) => {
      const cleanedLine = line.trim();

      // Skip empty lines and comments
      if (!cleanedLine) {
        return;
      }
      if (cleanedLine.startsWith('#')) {
        return;
      }

      // Line wraps multiple lines
      if (cleanedLine.indexOf('=') === -1) {
        if (lineBuffer) {
          lineBuffer[1] += cleanedLine;
        }
      } else {
        if (lineBuffer) {
          // This line terminates a wrapped line
          this.parsedData[lineBuffer[0].trim()] = lineBuffer[1].trim();
        }

        lineBuffer = cleanedLine.split('=', 2);
      }
    });

    // Handle any left-over wrapped line data
    if (lineBuffer) {
      this.parsedData[lineBuffer[0].trim()] = lineBuffer[1].trim();
    }

    this.isValid = true;
  }
}
