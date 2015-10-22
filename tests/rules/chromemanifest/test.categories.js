import { VALIDATION_WARNING } from 'const';
import { DANGEROUS_CATEGORY } from 'messages';
import ChromeManifestScanner from 'scanners/chromemanifest';
import { validChromeManifest } from '../../helpers';


describe('chrome.manifest Category Rules', () => {

  it('should detect dangerous categories', () => {
    var manifest = validChromeManifest([
      'category JavaScript-DOM-class foo bar',
    ]);

    var cmScanner = new ChromeManifestScanner(manifest, 'chrome.manifest');
    return cmScanner.scan()
      .then((messages) => {
        assert.equal(messages.length, 1);
        assert.equal(messages[0].code, DANGEROUS_CATEGORY.code);
        assert.equal(messages[0].type, VALIDATION_WARNING);
        assert.equal(messages[0].line, 2);
      });
  });

  it('should detect multiple dangerous categories', () => {
    var manifest = validChromeManifest([
      'category JavaScript-DOM-class foo bar',
      'category JavaScript-DOM-interface foo bar',
    ]);

    var cmScanner = new ChromeManifestScanner(manifest, 'chrome.manifest');
    return cmScanner.scan()
      .then((messages) => {
        assert.equal(messages.length, 2);
      });
  });

});
