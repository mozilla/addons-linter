import { parse } from 'properties-parser';

import BaseScanner from 'scanners/base';
import * as rules from 'rules/properties';


export default class PropertiesScanner extends BaseScanner {
  _defaultRule = rules;

  _getContents() {
    return new Promise((resolve) => {
      var propertiesDoc = parse(this.contents);

      resolve(propertiesDoc);
    });
  }
}
