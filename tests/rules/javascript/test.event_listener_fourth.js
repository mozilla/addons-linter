import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import * as messages from 'messages';

describe('event_listener_fourth', () => {
  it('should not allow a true literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, true);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.EVENT_LISTENER_FOURTH.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should allow a false literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, false);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow a truthy literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, "true");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.EVENT_LISTENER_FOURTH.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should allow a falsy literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, "");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var t = 'true';
      window.addEventListener("click", function(){}, false, t);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.EVENT_LISTENER_FOURTH.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should allow a false identifier', () => {
    var code = singleLineString`var t = false;
      window.addEventListener("click", function(){}, false, t);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, false);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, false);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, true);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.EVENT_LISTENER_FOURTH.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, true);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.EVENT_LISTENER_FOURTH.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
