import { Readable } from 'stream';
import { VALIDATION_WARNING } from 'const';
import { DANGEROUS_CATEGORY } from 'messages';

import ChromeManifestScanner from 'scanners/chromemanifest';


describe('chrome.manifest Category Rules', () => {

  it('should detect dangerous categories', () => {
    var rstream = new Readable();
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
    rstream.push('category JavaScript-DOM-class foo bar\n');
    rstream.push(null);
    var cmScanner = new ChromeManifestScanner(rstream, 'chrome.manifest');
    return cmScanner.scan()
      .then((messages) => {
        assert.equal(messages.length, 1);
        assert.equal(messages[0].code, DANGEROUS_CATEGORY.code);
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

});
