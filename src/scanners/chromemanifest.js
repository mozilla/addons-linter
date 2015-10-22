import ChromeManifestParser from 'parsers/chromemanifest';
import * as rules from 'rules/chromemanifest';
import { ignorePrivateFunctions } from 'utils';


export default class ChromeManifestScanner {

  constructor(stream, filename) {
    this.stream = stream;
    this.filename = filename;
    this._rulesProcessed = 0;
  }

  scan(_ChromeManifestParser=ChromeManifestParser, _rules=rules) {
    return new Promise((resolve) => {
      var validatorMessages = [];
      var cmParser = new _ChromeManifestParser(this.stream, this.filename);
      return cmParser.parse()
        .then((triples) => {
          var rules = ignorePrivateFunctions(_rules);

          for (let rule in rules) {
            this._rulesProcessed++;

            validatorMessages = validatorMessages.concat(rules[rule](triples));
          }

          resolve(validatorMessages);
        });
    });
  }
}
