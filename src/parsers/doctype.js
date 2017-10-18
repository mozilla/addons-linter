// Stolen from mozilla-central
const entityRe = /<!ENTITY\s+([\w.]*)\s+("[^"]*"|'[^']*')\s*>/;


export default class DoctypeParser {
  constructor(dtdString, collector, { filename = null } = {}) {
    this._dtdString = dtdString;

    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;

    // Set the filename for this file
    this.filename = filename;

    // This marks whether a DTD file is valid.
    this.isValid = null;
  }

  parse() {
    const entities = this._dtdString.match(new RegExp(entityRe, 'g'));
    this.parsedData = {};

    if (!entities) {
      console.log('NOTHING?');
      // Some files have no entities defined.
      return;
    }

    entities.forEach((entity) => {
      const [, key, value] = entity.match(entityRe);

      // strip enclosing quotation marks
      const normalizedValue = value.slice(1, -1);

      this.parsedData[key] = normalizedValue;
    });

    // If never marked as invalid, this is a valid JSON file.
    if (this.isValid !== false) {
      this.isValid = true;
    }
  }
}
