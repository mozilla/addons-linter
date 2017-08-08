import JSONParser from 'parsers/json';
import BaseScanner from 'scanners/base';


export default class JSONScanner extends BaseScanner {
  static get scannerName() {
    return 'json';
  }

  _getContents() {
    return Promise.resolve(this.contents);
  }

  scan() {
    return this.getContents()
      .then((json) => {
        const jsonParser = new JSONParser(json, this.options.collector, {
          filename: this.filename });
        jsonParser.parse();
        return Promise.resolve({
          linterMessages: [],
          scannedFiles: [this.filename],
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }
}
