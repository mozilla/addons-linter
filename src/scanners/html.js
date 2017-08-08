import cheerio from 'cheerio';

import BaseScanner from 'scanners/base';
import * as rules from 'rules/html';


export default class HTMLScanner extends BaseScanner {
  _defaultRules = rules;

  static get scannerName() {
    return 'html';
  }

  _getContents() {
    return new Promise((resolve) => {
      const htmlDoc = cheerio.load(this.contents);
      resolve(htmlDoc);
    });
  }
}
