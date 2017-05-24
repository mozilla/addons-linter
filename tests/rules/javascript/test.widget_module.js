import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('widget_module', () => {

  it('should catch require() first arg being a global', () => {
    var code = `widgetPath = 'sdk/widget';
    require(widgetPath).Widget({
      id: "mozilla-icon",
      label: "My Mozilla Widget",
      contentURL: "http://www.mozilla.org/favicon.ico"
    });`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code,
                     messages.UNEXPECTED_GLOGAL_ARG.code);
        assert.equal(linterMessages[0].type, VALIDATION_WARNING);
      });
  });

});
