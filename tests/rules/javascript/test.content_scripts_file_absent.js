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
    const code = `browser.tabs.executeScript({file: '/content_scripts/absentFile.js'});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_NOT_FOUND.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });

  it('should not show an error when content script is not missing', async () => {
    const code = `browser.tabs.executeScript({file: '/content_scripts/existingFile.js'});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript, { 'content_scripts/existingFile.js': '' });

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should not report any errors when filename is not static string', async () => {
    const code = `
      const fileName = 'script.js';
      browser.tabs.executeScript({file: \`/content_scripts/\${fileName}\`});
      browser.tabs.executeScript({file: '/content_scripts/'+ fileName });
      browser.tabs.executeScript({file: '/content_scripts/' + 'absentFile.js' });
      browser.tabs.executeScript(1,{file: '/content_scripts/' + 'absentFile.js' });
      browser.tabs.executeScript(1,{file: 2 });
      browser.tabs.executeScript(1,{file: null });
    `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript, { 'content_scripts/existingFile.js': '' });

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should not break validator when file property missing', async () => {
    const code = `browser.tabs.executeScript({code: 'console.log("lol")'});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    try {
      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages).toEqual([]);
    } catch (e) {
      expect(true).toBe(false);
    }
  });

  it('should report empty filename error', async () => {
    const code = `browser.tabs.executeScript(1,{file: '' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_EMPTY.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });

  it('should not report an error when execute script not on the browser.tabs object', async () => {
    const code = `function test() {
                  myObj.tabs.executeScript({ file: '' });
                  myObj2.executeScript({ file: '' });
                  executeScript({ file: '' });
                }`;
    const fileWithCode = 'file-with-code.js';
    const jsScanner = createJsScanner(code, fileWithCode);

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });
});
