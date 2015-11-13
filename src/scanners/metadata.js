import BaseScanner from 'scanners/base';
import * as rules from 'rules/metadata';


export default class MetadataScanner extends BaseScanner {

  _defaultRules = rules;

  // This class exists to keep things simple and reuse our scanner
  // infrastructure, but because metadata is already parsed by the scanner
  // and is a simple object, this just returns the same object back.
  _getContents() {
    return Promise.resolve(this.contents);
  }

}
