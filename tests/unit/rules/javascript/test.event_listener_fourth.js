import { oneLine } from 'common-tags';

import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import * as messages from 'messages';

import { runJsScanner } from '../../helpers';

describe('event_listener_fourth', () => {
  it('should not allow a true literal', async () => {
    const code = 'window.addEventListener("click", function(){}, false, true);';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.EVENT_LISTENER_FOURTH.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should allow a false literal', async () => {
    const code =
      'window.addEventListener("click", function(){}, false, false);';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not allow a truthy literal', async () => {
    const code =
      'window.addEventListener("click", function(){}, false, "true");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.EVENT_LISTENER_FOURTH.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should allow a falsy literal', async () => {
    const code = 'window.addEventListener("click", function(){}, false, "");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not allow a true identifier', async () => {
    const code = oneLine`var t = 'true';
      window.addEventListener("click", function(){}, false, t);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.EVENT_LISTENER_FOURTH.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should allow a false identifier', async () => {
    const code = oneLine`var t = false;
      window.addEventListener("click", function(){}, false, t);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not allow a window identifier', async () => {
    const code = oneLine`var foo = window;
      foo.addEventListener("click", function(){}, false, false);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not allow a hidden addEventListener identifier', async () => {
    const code = oneLine`var foo = window.addEventListener;
      foo("click", function(){}, false, false);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not allow a true identifier with untrusted argument', async () => {
    const code = oneLine`var foo = window;
      foo.addEventListener("click", function(){}, false, true);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.EVENT_LISTENER_FOURTH.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should not allow a true identifier hidden with arg', async () => {
    const code = oneLine`var foo = window.addEventListener;
      foo("click", function(){}, false, true);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.EVENT_LISTENER_FOURTH.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });
});
