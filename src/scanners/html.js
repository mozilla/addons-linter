import * as cheerio from 'cheerio';

import BaseScanner from 'scanners/base';
import * as rules from 'rules/html';

export default class HTMLScanner extends BaseScanner {
  _defaultRules = rules;

  constructor(contents, filename, options = {}) {
    super(contents, filename, options);
    this.loadHTML = this.options.loadHTML ?? cheerio.load;
  }

  static get scannerName() {
    return 'html';
  }

  async _getContents() {
    return this.loadHTML(this.contents);
  }
}
