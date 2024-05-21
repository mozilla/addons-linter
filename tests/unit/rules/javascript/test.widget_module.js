import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

import { runJsScanner } from '../../helpers';

describe('widget_module', () => {
  it('should catch require() first arg being a global', async () => {
    const code = `widgetPath = 'sdk/widget';
    require(widgetPath).Widget({
      id: "mozilla-icon",
      label: "My Mozilla Widget",
      contentURL: "http://www.mozilla.org/favicon.ico"
    });`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.UNEXPECTED_GLOBAL_ARG.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });
});
