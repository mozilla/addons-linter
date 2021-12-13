import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

import { runJsScanner } from '../../helpers';

jest.mock('schema/browser-apis.js', () => {
  return {
    hasBrowserApi: () => false,
    isMV2RemovedApi: () => true,
  };
});

describe('unsupported manifest v2 APIs tested with mock', () => {
  beforeAll(() => jest.resetModules());

  it('returns expected message for APIs unsupported in manifest_version >= 3', async () => {
    const jsScanner = new JavaScriptScanner(
      'browser.pageAction.show();',
      'code.js',
      { addonMetadata: { id: '@mv2-unsupported-api' } }
    );

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: messages.REMOVED_MV2_API.code,
          type: VALIDATION_WARNING,
          message: expect.stringMatching(
            /"pageAction.show" has been removed in Manifest Version 3/
          ),
        }),
      ])
    );
    expect(linterMessages.length).toEqual(1);
  });
});
