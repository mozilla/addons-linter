import { Readable } from 'stream';
import { VALIDATION_WARNING } from 'const';

import ChromeManifestScanner from 'validators/chromemanifest';


describe('ChromeManifestScanner', () => {

  it('should detect dangerous categories', () => {
    var rstream = new Readable();
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
    rstream.push('category JavaScript-DOM-class foo bar\n');
    rstream.push(null);
    var cmScanner = new ChromeManifestScanner(rstream, 'chrome.manifest');
    return cmScanner.scan()
      .then((messages) => {
        assert.equal(messages.length, 1);
        assert.equal(messages[0].code, 'DANGEROUS_CATEGORY');
        assert.equal(messages[0].type, VALIDATION_WARNING);
        assert.equal(messages[0].line, 2);
      });
  });

  it('should detect multiple dangerous categories', () => {
    var rstream = new Readable();
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
    rstream.push('category JavaScript-DOM-class foo bar\n');
    rstream.push('category JavaScript-DOM-interface foo bar\n');
    rstream.push(null);
    var cmScanner = new ChromeManifestScanner(rstream, 'chrome.manifest');
    return cmScanner.scan()
      .then((messages) => {
        assert.equal(messages.length, 2);
      });
  });

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
