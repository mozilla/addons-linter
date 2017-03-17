import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';

describe('unsupported browser APIs', () => {
  it('flags gcm usage on chrome', () => {
    const code = 'chrome.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });
    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(
          validationMessages.length, 1);
        assert.equal(validationMessages[0].code, 'UNKNOWN_API');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('flags gcm usage on browser', () => {
    const code = 'browser.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });
    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(
          validationMessages.length, 1);
        assert.equal(validationMessages[0].code, 'UNKNOWN_API');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('does not flag gcm usage on some other object', () => {
    const code = 'gcmLib.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });
    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });
});
