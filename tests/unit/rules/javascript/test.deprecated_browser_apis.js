import { VALIDATION_WARNING, DEPRECATED_JAVASCRIPT_APIS } from 'const';
import { DEPRECATED_API } from 'messages/javascript';
import JavaScriptScanner from 'scanners/javascript';

import { validMetadata } from '../../helpers';

describe('deprecated browser APIs', () => {
  DEPRECATED_JAVASCRIPT_APIS.forEach((api) => {
    it(`should return deprecation warning when ${api} is used`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({}) };
      const code = `chrome.${api}(function() {});`;
      const jsScanner = new JavaScriptScanner(code, 'code.js', fakeMetadata);

      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].message).toEqual(`${api} is deprecated`);
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });
  });
});
