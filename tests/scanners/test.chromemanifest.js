import ChromeManifestScanner from 'scanners/chromemanifest';
import * as rules from 'rules/chromemanifest';
import { getRuleFiles, validChromeManifest } from '../helpers';
import { ignorePrivateFunctions } from 'utils';


describe('ChromeManifestScanner', () => {

  it('should process all rules', () => {
    var fakeRules = {
      fakeRule1: sinon.stub(),
      fakeRule2: sinon.stub(),
    };

    var manifest = validChromeManifest();

    var cmScanner = new ChromeManifestScanner(manifest, 'chrome.manifest');
    return cmScanner.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.fakeRule1.calledOnce);
        assert.ok(fakeRules.fakeRule2.calledOnce);
      });
  });

  it('should export and run all rules in rules/chromemanifest', () => {
    var ruleFiles = getRuleFiles('chromemanifest');

    var manifest = validChromeManifest();
    var cmScanner = new ChromeManifestScanner(manifest, 'chrome.manifest');

    assert.equal(ruleFiles.length,
                 Object.keys(ignorePrivateFunctions(rules)).length);

    return cmScanner.scan()
      .then(() => {
        assert.equal(cmScanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

  it('should ask for a stream', () => {
    assert(ChromeManifestScanner.fileResultType, 'stream');
  });
});
