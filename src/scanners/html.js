import cheerio from 'cheerio';

import BaseScanner from 'scanners/base';
import * as rules from 'rules/html';


export default class HTMLScanner extends BaseScanner {

  _defaultRules = rules;

  _getContents() {
    return new Promise((resolve) => {
      var htmlDoc = cheerio.load(this.contents);
      resolve(htmlDoc);
    });
  }

}
