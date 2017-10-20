const ENTITY_RE = /<!ENTITY\s+([\w.]*)\s+("[^"]*"|'[^']*')\s*>/;


export default class DoctypeParser {
  /*
   * Minimalistic parser for DTD files.
   * We are using DTD files in our language packs to specify translations.
   *
   * It doesn't do any proper XML parsing because our DTD files are only
   * using a very small subset of what's needed so a simple regular expression
   * works just fine.
   *
   * The parsing code is largely inspired by scattered code from mozilla-central.
   */

  constructor(dtdString, collector, { filename = null } = {}) {
    this._dtdString = dtdString;
    this.collector = collector;
    this.filename = filename;
    this.isValid = null;
  }

  parse() {
    const entities = this._dtdString.match(new RegExp(ENTITY_RE, 'g'));
    this.parsedData = {};

    if (!entities) {
      // Some files have no entities defined. Mark this as valid since we
      // expect this unfortunately...
      this.isValid = true;
      return;
    }

    entities.forEach((entity) => {
      const [, key, value] = entity.match(ENTITY_RE);

      // strip enclosing quotation marks
      const normalizedValue = value.slice(1, -1);

      this.parsedData[key] = normalizedValue;
    });

    this.isValid = true;
  }
}
