import { VALIDATION_ERROR } from 'const';
import { CONTENT_SCRIPT_NOT_FOUND, CONTENT_SCRIPT_EMPTY } from 'messages/javascript';
import JavaScriptScanner from 'scanners/javascript';

function createJsScanner(code, validatedFilename, existingFiles = {}) {
  return new JavaScriptScanner(code, validatedFilename, {
    addonMetadata: { id: 'test' },
    existingFiles: {
      ...existingFiles,
      [validatedFilename]: '',
    },
  });
}

describe('content_scripts_file_absent', () => {
  it('should show an error when content script is missing', async () => {
    const code = `browser.tabs.executeScript({ file: '/content_scripts/absentFile.js' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_NOT_FOUND.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });

  it('should not show an error when content script file exists', async () => {
    const code = `browser.tabs.executeScript({ file: '/content_scripts/existingFile.js' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript, { 'content_scripts/existingFile.js': '' });

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should not report any errors when filename is not static string', async () => {
    const code = `
      browser.tabs.executeScript({ file: \`/content_scripts/\${fileName}\` });
      browser.tabs.executeScript({ file: '/content_scripts/'+ fileName });
      browser.tabs.executeScript({ file: '/content_scripts/' + 'absentFile.js' });
      browser.tabs.executeScript(1, { file: '/content_scripts/' + 'absentFile.js' });
      browser.tabs.executeScript(1, { file: 2 });
      browser.tabs.executeScript(1, { file: null });
      browser.tabs.executeScript({ code: 'console.log("lol")' });
      browser.noTabs.executeScript({ file: '' });
      myObj.tabs.executeScript({ file: '' });
      myObj2.executeScript({ file: '' });
      executeScript({ file: '' });
    `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript, { 'content_scripts/existingFile.js': '' });

    let { linterMessages } = await jsScanner.scan();
    linterMessages = linterMessages.filter((message) => {
      return message.code in [CONTENT_SCRIPT_EMPTY.code, CONTENT_SCRIPT_NOT_FOUND.code];
    });
    expect(linterMessages).toEqual([]);
  });

  it('should report empty filename error', async () => {
    const code = `browser.tabs.executeScript(1, { file: '' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_EMPTY.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });
});
