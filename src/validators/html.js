import cheerio from 'cheerio';

import * as rules from 'rules/html';


export default class HTMLScanner {

  constructor(contents, filename) {
    this.contents = contents;
    this.filename = filename;
    this.validatorMessages = [];
    this._htmlDoc = null;
  }

  scan(_rules=rules) {
    return new Promise((resolve, reject) => {
      this.getHTMLDoc()
        .then((htmlDoc) => {
          var promises = [];

          for (let rule in _rules) {
            promises.push(_rules[rule](htmlDoc, this.filename));
          }

          return Promise.all(promises);
        })
        .then((ruleResults) => {
          for (let messages of ruleResults) {
            this.validatorMessages = this.validatorMessages.concat(messages);
          }

          resolve(this.validatorMessages);
        })
        .catch(reject);
    });
  }

  getHTMLDoc() {
    return new Promise((resolve) => {
      if (this._htmlDoc !== null) {
        return resolve(this._htmlDoc);
      }

      this._htmlDoc = cheerio.load(this.contents);

      resolve(this._htmlDoc);
    });
  }

}
