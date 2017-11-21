import { VALIDATION_ERROR } from 'const';
import { CONTENT_SCRIPT_NOT_FOUND } from 'messages/javascript';
import JavaScriptScanner from 'scanners/javascript';

describe('content_scripts_file_absent', () => {
  it('should show an error when content script is missing', () => {
    const code = `const scriptPath = '/content_scripts/absentFile.js'`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
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
    const code = `const scriptPath = '/content_scripts/absentFile.js'`;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
        'content_scripts/absentFile.js': '',
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path based on templates', () => {
    const code = `const fileName = 'script.js'; const scriptPath = \`/content_scripts/\${fileName}\``;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path not a static string', () => {
    const code = `const fileName = 'script.js'; const scriptPath = '/content_scripts/' + fileName `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not show an error when content script path not a static string second case', () => {
    const code = `const scriptPath = '/content_scripts/' + 'absentFile.js' `;
    const fileRequiresContentScript = 'file-requires-content-script.js';
    const jsScanner = new JavaScriptScanner(code, fileRequiresContentScript, {
      existingFiles: {
        fileRequiresContentScript,
      },
    });

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });
});
