import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import * as messages from 'messages';

describe('event_listener_fourth', () => {
  it('should not allow a true literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, true);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a false literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, false);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a truthy literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, "true");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a falsy literal', () => {
    var code = 'window.addEventListener("click", function(){}, false, "");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a true identifier', () => {
    var code = singleLineString`var t = 'true';
      window.addEventListener("click", function(){}, false, t);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a false identifier', () => {
    var code = singleLineString`var t = false;
      window.addEventListener("click", function(){}, false, t);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a window identifier', () => {
    var code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, false);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a hidden addEventListener identifier', () => {
    var code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, false);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a true identifier with untrusted argument', () => {
    var code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, true);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should not allow a true identifier hidden with arg', () => {
    var code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, true);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

});
