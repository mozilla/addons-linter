import cheerio from 'cheerio';

import BaseValidator from 'validators/base';
import * as rules from 'rules/html';


export default class HTMLScanner extends BaseValidator {

  defaultRules = rules;

  _getContents() {
    return new Promise((resolve) => {
      var htmlDoc = cheerio.load(this.contents);

      resolve(htmlDoc);
    });
  }

}
