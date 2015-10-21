import { Readable } from 'stream';

import ChromeManifestScanner from 'scanners/chromemanifest';


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

});
