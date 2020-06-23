import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';

import { runJsScanner } from '../../helpers';

const NOW_UNSUPPORTED_APIS = [
  'app.getDetails',
  'extension.onRequest',
  'extension.onRequestExternal',
  'extension.sendRequest',
  'tabs.getAllInWindow',
  'tabs.getSelected',
  'tabs.onActiveChanged',
  'tabs.onSelectionChanged',
  'tabs.sendRequest',
];

describe('unsupported browser APIs', () => {
  it('flags gcm usage on chrome', async () => {
    const code = 'chrome.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].message).toEqual('gcm.register is not supported');
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('flags gcm usage on browser', async () => {
    const code = 'browser.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].message).toEqual('gcm.register is not supported');
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('does not flag gcm usage on some other object', async () => {
    const code = 'gcmLib.gcm.register(["foo"], function() {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  NOW_UNSUPPORTED_APIS.forEach((api) => {
    it(`should return unsupported warning when ${api} is used`, async () => {
      const fakeMetadata = { addonMetadata: { id: '@unsupported-api' } };
      const code = `browser.${api}();`;
      const jsScanner = new JavaScriptScanner(code, 'code.js', fakeMetadata);

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].message).toEqual(
        `"${api}" is deprecated or unimplemented`
      );
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });
  });

  it('does not flag on 3 levels of nesting', async () => {
    const code =
      'browser.privacy.websites.thirdPartyCookiesAllowed.get({}, () => {})';
    const jsScanner = new JavaScriptScanner(code, 'goodcode.js', {
      addonMetadata: { id: '@supported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('does not flag if the property is in a variable', async () => {
    const code = `
      const AREA = 'local';
      browser.storage[AREA].set('foo', 'FOO');
    `;
    const jsScanner = new JavaScriptScanner(code, 'goodcode.js', {
      addonMetadata: { id: '@supported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  // We only test the first two levels for now.
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('flags when 3 levels of nesting is unsupported', async () => {
    const code =
      'browser.privacy.websites.unsupportedSetting.get({}, () => {})';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js', {
      addonMetadata: { id: '@unsupported-api' },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
  });

  it('supports browser.menus', async () => {
    const code = 'browser.menus.create({ id: "id", title: "title" });';
    const jsScanner = new JavaScriptScanner(code, 'goodcode.js', {
      addonMetadata: { id: '@supported-api', permissions: ['menus'] },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('supports browser.contextMenus', async () => {
    const code = 'browser.contextMenus.create({ id: "id", title: "title" });';
    const jsScanner = new JavaScriptScanner(code, 'goodcode.js', {
      addonMetadata: { id: '@supported-api', permissions: ['contextMenus'] },
    });

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });
});
