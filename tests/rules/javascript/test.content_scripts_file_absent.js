import { VALIDATION_ERROR } from 'const';
import { CONTENT_SCRIPT_NOT_FOUND } from 'messages/javascript';
import JavaScriptScanner from 'scanners/javascript';

describe('content_scripts_file_absent', () => {
  it('should show an error when content script is missing', () => {
    const code = `browser.tabs.executeScript({file: '/content_scripts/absentFile.js'});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        linterMessages.sort();
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_NOT_FOUND.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
      });
  });

  it('should not show an error when content script is not missing', () => {
    const code = `browser.tabs.executeScript({file: '/content_scripts/existingFile.js'});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
        'content_scripts/existingFile.js': '',
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path based on templates', () => {
    const code = `const fileName = 'script.js'; browser.tabs.executeScript({file: \`/content_scripts/\${fileName}\`});`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path not a static string', () => {
    const code = `const fileName = 'script.js'; browser.tabs.executeScript({file: '/content_scripts/'+ fileName });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path not a static string second case', () => {
    const code = `browser.tabs.executeScript({file: '/content_scripts/' + 'absentFile.js' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should also work when we call executeScript with optional parameters', () => {
    const code = `browser.tabs.executeScript(1,{file: '/content_scripts/' + 'absentFile.js' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
      addonMetadata: {
        id: 'test',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });
});
