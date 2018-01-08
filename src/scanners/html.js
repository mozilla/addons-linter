import cheerio from 'cheerio';

import BaseScanner from 'scanners/base';
import * as rules from 'rules/html';


export default class HTMLScanner extends BaseScanner {
  _defaultRules = rules;

  static get scannerName() {
    return 'html';
  }

  async _getContents() {
    const htmlDoc = cheerio.load(this.contents);
    return htmlDoc;
  }
}
