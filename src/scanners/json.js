import JSONParser from 'parsers/json';
import BaseScanner from 'scanners/base';


export default class JSONScanner extends BaseScanner {

  _getContents() {
    return Promise.resolve(this.contents);
  }

  scan() {
    return this.getContents()
      .then((json) => {
        let jsonParser = new JSONParser(json, this.options.collector, {
          filename: this.filename});
        jsonParser.parse();
        return Promise.resolve({
          messages: [],
          scannedFiles: [this.filename]
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

}
