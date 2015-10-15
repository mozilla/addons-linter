import ChromeManifestParser from 'parsers/chromemanifest';
import * as rules from 'rules/chromemanifest';


export default class ChromeManifestScanner {

  constructor(stream, filename) {
    this.stream = stream;
    this.filename = filename;
  }

  scan(_ChromeManifestParser=ChromeManifestParser, _rules=rules) {
    return new Promise((resolve) => {
      var validatorMessages = [];
      var cmParser = new _ChromeManifestParser(this.stream, this.filename);
      return cmParser.parse()
        .then((triples) => {
          for (let rule in _rules) {
            let ruleFunc = _rules[rule];
            if (typeof ruleFunc === 'function') {
              validatorMessages = validatorMessages.concat(ruleFunc(triples));
            }
          }
          resolve(validatorMessages);
        });
    });
  }
}
