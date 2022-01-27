import { VALIDATION_WARNING } from 'const';
import { NO_DOCUMENT_WRITE } from 'messages';
import JavaScriptScanner from 'scanners/javascript';

import { runJsScanner } from '../../helpers';

describe(__filename, () => {
  it('should warn about using document.write()', async () => {
    const code = 'document.write();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    linterMessages.sort();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(NO_DOCUMENT_WRITE.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should not warn about using other member functions', async () => {
    const code = 'document.doNothing();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not warn about calling write() in general', async () => {
    const code = 'foo.write();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not warn about calling write() to a non-global document', async () => {
    const code = 'foo.document.write();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });

  it('should not warn about calling write() to non member of document', async () => {
    const code = 'document.foo.write();';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });
});
