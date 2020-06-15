import { VALIDATION_ERROR } from 'const';
import {
  CONTENT_SCRIPT_NOT_FOUND,
  CONTENT_SCRIPT_EMPTY,
} from 'messages/javascript';
import JavaScriptScanner from 'scanners/javascript';

import { runJsScanner } from '../../helpers';

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
  it('should show an error for a missing absolute content script path', async () => {
    // absolute path since we don't validate relative paths
    const nonExistentFile = '/really/absent/absentFile.js';

    const code = `browser.tabs.executeScript({ file: '${nonExistentFile}' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await runJsScanner(jsScanner);

    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_NOT_FOUND.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });

  it('should not show an error when relative content script is missing', async () => {
    const filename = ['absentFile.js'];

    const code = `browser.tabs.executeScript({ file: '${filename}' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not show an error when content script file exists', async () => {
    const code = `
      browser.tabs.executeScript({ file: '/content_scripts/existingFile.js' });

      // File path is relative to current file.
      browser.tabs.executeScript({ file: 'anotherFolder/contentScript.js' });
      browser.tabs.executeScript({ file: 'contentScript.js' });
    `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const existingFiles = {
      'content_scripts/existingFile.js': '',
      'anotherFolder/contentScript.js': '',
      'contentScript.js': '',
    };
    const jsScanner = createJsScanner(
      code,
      fileRequiresContentScript,
      existingFiles
    );

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages).toEqual([]);
  });

  it('should not show an error when content script file exists and scanned file is in subdirectory', async () => {
    const code = `
      browser.tabs.executeScript({ file: '/content_scripts/existingFile.js' });

      // File path is relative to current file.
      browser.tabs.executeScript({ file: 'anotherFolder/contentScript.js' });
      browser.tabs.executeScript({ file: 'contentScript.js' });
      browser.tabs.executeScript({ file: 'files/script/preload.js' });
    `;
    const fileRequiresContentScript =
      'files/script/file-requires-content-script.js';
    const existingFiles = {
      'content_scripts/existingFile.js': '',
      'anotherFolder/contentScript.js': '',
      'files/script/preload.js': '',
      'contentScript.js': '',
    };
    const jsScanner = createJsScanner(
      code,
      fileRequiresContentScript,
      existingFiles
    );

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages).toEqual([]);
  });

  it('should not report false positive errors', async () => {
    const code = `
      // API calls using a non literal strings file attribute.
      browser.tabs.executeScript({ file: \`/content_scripts/\${fileName}\` });
      browser.tabs.executeScript({ file: '/content_scripts/'+ fileName });
      browser.tabs.executeScript({ file: '/content_scripts/' + 'absentFile.js' });
      browser.tabs.executeScript(1, { file: '/content_scripts/' + 'absentFile.js' });

      // API calls with a non string file attribute.
      browser.tabs.executeScript(1, { file: 2 });
      browser.tabs.executeScript(1, { file: null });

      // API calls using a non literal strings file attribute.
      browser.tabs.executeScript({ code: 'console.log("lol")' });

      // API calls without a file attribute.
      browser.noTabs.executeScript({ file: '' });
      myObj.tabs.executeScript({ file: '' });
      myObj2.executeScript({ file: '' });
      executeScript({ file: '' });

      // Not even an API call, but linter should not choke on it.
      browser.tabs.executeScript;
    `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript, {
      'content_scripts/existingFile.js': '',
    });

    let { linterMessages } = await runJsScanner(jsScanner);
    linterMessages = linterMessages.filter((message) => {
      return (
        message.code in
        [CONTENT_SCRIPT_EMPTY.code, CONTENT_SCRIPT_NOT_FOUND.code]
      );
    });
    expect(linterMessages).toEqual([]);
  });

  it('should report empty filename error', async () => {
    const code = `browser.tabs.executeScript(1, { file: '' });`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = createJsScanner(code, fileRequiresContentScript);

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(CONTENT_SCRIPT_EMPTY.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);
  });
});
