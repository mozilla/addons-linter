import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

import { runJsScanner } from '../../helpers';

describe('opendialog_nonlit_uri', () => {
  it('should provide notice on non-literal uris passed to openDialog', async () => {
    const code = `var bar="https://whavever";
                foo.openDialog(bar);`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.OPENDIALOG_NONLIT_URI.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });
});
