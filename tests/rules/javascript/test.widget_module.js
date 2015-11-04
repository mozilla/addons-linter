import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('widget_module', () => {

  it('should catch require of sdk/widget as literal', () => {
    var code = `require("sdk/widget").Widget({
      id: "mozilla-icon",
      label: "My Mozilla Widget",
      contentURL: "http://www.mozilla.org/favicon.ico"
    });`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.DEPREC_SDK_MOD_WIDGET.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should catch require of sdk/widget as var', () => {
    var code = `var path = 'sdk/widget';
    require(path).Widget({
      id: "mozilla-icon",
      label: "My Mozilla Widget",
      contentURL: "http://www.mozilla.org/favicon.ico"
    });`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.DEPREC_SDK_MOD_WIDGET.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should catch require() first arg being a global', () => {
    var code = `widgetPath = 'sdk/widget';
    require(widgetPath).Widget({
      id: "mozilla-icon",
      label: "My Mozilla Widget",
      contentURL: "http://www.mozilla.org/favicon.ico"
    });`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.UNEXPECTED_GLOGAL_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
