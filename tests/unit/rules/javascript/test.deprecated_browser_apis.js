import * as messages from 'messages';
import { VALIDATION_WARNING, DEPRECATED_JAVASCRIPT_APIS } from 'const';
import JavaScriptScanner from 'scanners/javascript';

import { validMetadata, replacePlaceholders } from '../../helpers';

describe('deprecated browser APIs', () => {
  Object.entries(DEPRECATED_JAVASCRIPT_APIS).forEach(
    ([api, messageOverride]) => {
      it(`should return deprecation warning when ${api} is used`, async () => {
        const fakeMetadata = { addonMetadata: validMetadata({}) };
        const code = `chrome.${api}(); browser.${api}();`;
        const jsScanner = new JavaScriptScanner(code, 'code.js', fakeMetadata);

        const { linterMessages } = await jsScanner.scan();
        // Two warnings for chrome.* and browser.* related calls.
        expect(linterMessages.length).toEqual(2);

        let message = `${api} is deprecated`;

        if (messageOverride) {
          message = replacePlaceholders(
            // eslint-disable-next-line import/namespace
            messages[messageOverride].messageFormat,
            { api }
          );
        }

        expect(linterMessages[0].message).toEqual(message);
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        expect(linterMessages[1].message).toEqual(message);
        expect(linterMessages[1].type).toEqual(VALIDATION_WARNING);
      });
    }
  );
});
