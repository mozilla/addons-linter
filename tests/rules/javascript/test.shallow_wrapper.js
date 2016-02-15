import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('shallow_wrapper', () => {

  // I can't verify that this is how XPCNativeWrapper works so we're skipping
  // this test.
  // TODO: Remove this test or figure out if it's required.
  it.skip('should allow use of XPCNativeWrapper with only one argument', () => {
    var code = 'XPCNativeWrapper(unsafeWindow);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow use of shallow wrapper with a variable', () => {
    var code = `XPCNativeWrapper(unsafeWindow, 'foo');
                var wrap = new XPCNativeWrapper(unsafeWindow, 'doc', 'a');`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 2);
        for (let message of validationMessages) {
          assert.equal(message.code, messages.SHALLOW_WRAPPER.code);
          assert.equal(message.type, VALIDATION_WARNING);
        }
      });
  });

  it('should not allow use of shallow wrapper with a member variable', () => {
    var code = `XPCNativeWrapper(window._content, 'foo');
                var wrap = new XPCNativeWrapper(window._content, 'doc', 'a');`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 2);
        for (let message of validationMessages) {
          assert.equal(message.code, messages.SHALLOW_WRAPPER.code);
          assert.equal(message.type, VALIDATION_WARNING);
        }
      });
  });

});
