import { Readable } from 'stream';

import ChromeManifestScanner from 'scanners/chromemanifest';
import * as rules from 'rules/chromemanifest';
import { getRuleFiles } from '../helpers';
import { ignorePrivateFunctions } from 'utils';


describe('ChromeManifestScanner', () => {

  it('should process all rules', () => {
    var fakeRules = {
      fakeRule1: sinon.stub(),
      fakeRule2: sinon.stub(),
    };

    var rstream = new Readable();
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
    rstream.push('category JavaScript-DOM-class foo bar\n');
    rstream.push('category JavaScript-DOM-interface foo bar\n');
    rstream.push(null);
    var cmScanner = new ChromeManifestScanner(rstream, 'chrome.manifest');
    return cmScanner.scan(undefined, fakeRules)
      .then(() => {
        assert.ok(fakeRules.fakeRule1.calledOnce);
        assert.ok(fakeRules.fakeRule2.calledOnce);
      });
  });

  it('should export and run all rules in rules/chromemanifest', () => {
    var ruleFiles = getRuleFiles('chromemanifest');

    var rstream = new Readable();
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
    rstream.push('category JavaScript-DOM-class foo bar\n');
    rstream.push('category JavaScript-DOM-interface foo bar\n');
    rstream.push(null);
    var cmScanner = new ChromeManifestScanner(rstream, 'chrome.manifest');

    assert.equal(ruleFiles.length,
                 Object.keys(ignorePrivateFunctions(rules)).length);

    return cmScanner.scan()
      .then(() => {
        assert.equal(cmScanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

});
