import JSONParser from 'parsers/json';
import BaseScanner from 'scanners/base';

export default class JSONScanner extends BaseScanner {
  static get scannerName() {
    return 'json';
  }

  async _getContents() {
    return this.contents;
  }

  async scan() {
    const json = await this.getContents();

    const jsonParser = new JSONParser(
      json,
      this.options.collector,
      { filename: this.filename }
    );
    jsonParser.parse();

    return {
      linterMessages: [],
      scannedFiles: [this.filename],
    };
  }
}
