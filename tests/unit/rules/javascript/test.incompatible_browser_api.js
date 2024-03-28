import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';

import { runJsScanner } from '../../helpers';

describe('incompatible browser APIs', () => {
  it('flags event that is not yet implemented at strict_min_version', async () => {
    const code = 'browser.bookmarks.onChanged.addListener(() => {});';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { firefoxMinVersion: '50.0' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    expect(linterMessages[0].message).toEqual(
      'bookmarks.onChanged is not supported in Firefox version 50.0'
    );
  });

  it('flags method that is not yet implemented at strict_min_version', async () => {
    const code = 'browser.clipboard.setImageData({}, "png");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { firefoxMinVersion: '50.0' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    expect(linterMessages[0].message).toEqual(
      expect.stringMatching(
        /clipboard\.setImageData is not supported in Firefox version 50\.0/
      )
    );
  });

  it('does not flag APIs that are not implemented on Android', async () => {
    const code = 'browser.sidebarAction.open();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { firefoxMinVersion: '57.0a1' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('does not flag method that is implemented in the strict_min_version', async () => {
    const code = 'browser.clipboard.setImageData({}, "png");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { firefoxMinVersion: '57.0a1' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('does not flag method that is not supported without strict_min_version', async () => {
    const code = 'browser.clipboard.setImageData({}, "png");';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: {},
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });
});
