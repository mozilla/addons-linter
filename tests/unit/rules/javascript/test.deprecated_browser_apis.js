import * as messages from 'messages';
import { VALIDATION_WARNING, DEPRECATED_JAVASCRIPT_APIS } from 'const';
import JavaScriptScanner from 'scanners/javascript';

import {
  validMetadata,
  replacePlaceholders,
  runJsScanner,
} from '../../helpers';

describe('deprecated browser APIs', () => {
  Object.keys(DEPRECATED_JAVASCRIPT_APIS).forEach((api) => {
    it(`should return deprecation warning when ${api} is used`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({}) };
      const code = `chrome.${api}(); browser.${api}();`;
      const jsScanner = new JavaScriptScanner(code, 'code.js', fakeMetadata);

      const { linterMessages } = await runJsScanner(jsScanner);
      // Two warnings for chrome.* and browser.* related calls.
      expect(linterMessages.length).toEqual(2);

      let message = `${api} is deprecated`;

      const msgId = DEPRECATED_JAVASCRIPT_APIS[api];

      const messageObject =
        // eslint-disable-next-line import/namespace
        (msgId && messages[msgId]) || messages.DEPRECATED_API;

      message = replacePlaceholders(messageObject.messageFormat, { api });

      // The code for all deprecated messages is exactly the same.
      expect(linterMessages[0].code).toEqual(messages.DEPRECATED_API.code);
      expect(linterMessages[0].message).toEqual(message);
      expect(linterMessages[0].description).toEqual(
        messages.DEPRECATED_API.description
      );
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      expect(linterMessages[1].code).toEqual(messages.DEPRECATED_API.code);
      expect(linterMessages[1].message).toEqual(message);
      expect(linterMessages[1].description).toEqual(
        messages.DEPRECATED_API.description
      );
      expect(linterMessages[1].type).toEqual(VALIDATION_WARNING);
    });
  });
});
