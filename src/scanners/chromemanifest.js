import BaseScanner from 'scanners/base';
import ChromeManifestParser from 'parsers/chromemanifest';
import * as rules from 'rules/chromemanifest';


export default class ChromeManifestScanner extends BaseScanner {

  _defaultRules = rules;

  _getContents(_ChromeManifestParser=ChromeManifestParser) {
    var cmParser = new _ChromeManifestParser(this.contents, this.filename);
    return cmParser.parse();
  }

}
