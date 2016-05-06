import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

describe('eval_string_arg', () => {

  it('should allow the use of a function for setTimeout', () => {
    var code = 'window.setTimeout(function () { console.log("foo"); }, 1)';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not blow up when looking up a var declaration.', () => {
    var code = 'var foo; foo=function(){}; window.setTimeout(foo)';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should allow the use of arrow functions for setTimeout', () => {
    var code = 'window.setTimeout(() => { console.log("foo"); }, 1)';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should allow vars assigned to functions for setTimeout', () => {
    var code = singleLineString`var foo = function () {console.log("bar");};
      window.setTimeout(foo, 1);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow vars assigned to strings for setTimeout', () => {
    var code = 'var foo = "bar"; window.setTimeout(foo, 1);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.EVAL_STRING_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not allow the use of a non-function for setTimeout', () => {
    var code = 'window.setTimeout("foo")';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.EVAL_STRING_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not allow the use of a non-function for setInterval', () => {
    var code = 'window.setInterval("foo")';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.EVAL_STRING_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
