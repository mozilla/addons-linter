import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import * as messages from 'messages';

describe('event_listener_fourth', () => {
  it('should not allow a true literal', () => {
    const code = 'window.addEventListener("click", function(){}, false, true);';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a false literal', () => {
    const code = 'window.addEventListener("click", function(){}, false, false);';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a truthy literal', () => {
    const code = 'window.addEventListener("click", function(){}, false, "true");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a falsy literal', () => {
    const code = 'window.addEventListener("click", function(){}, false, "");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a true identifier', () => {
    const code = singleLineString`var t = 'true';
      window.addEventListener("click", function(){}, false, t);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should allow a false identifier', () => {
    const code = singleLineString`var t = false;
      window.addEventListener("click", function(){}, false, t);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a window identifier', () => {
    const code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, false);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a hidden addEventListener identifier', () => {
    const code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, false);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not allow a true identifier with untrusted argument', () => {
    const code = singleLineString`var foo = window;
      foo.addEventListener("click", function(){}, false, true);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should not allow a true identifier hidden with arg', () => {
    const code = singleLineString`var foo = window.addEventListener;
      foo("click", function(){}, false, true);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.EVENT_LISTENER_FOURTH.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });
});
