import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

import { runJsScanner } from '../../helpers';

describe('opendialog_remote_uri', () => {
  it('should warn on remote uris passed to openDialog', async () => {
    const code = `foo.openDialog("https://foo.com/bar/");
                foo.openDialog("http://foo.com/bar/");
                foo.openDialog("ftps://foo.com/bar/");
                foo.openDialog("ftp://foo.com/bar/");
                foo.openDialog("//foo.com/bar/");
                foo.openDialog("data:whatever");`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(6);
    linterMessages.forEach((message) => {
      expect(message.code).toEqual(messages.OPENDIALOG_REMOTE_URI.code);
      expect(message.type).toEqual(VALIDATION_WARNING);
    });
  });

  it('should not warn on local uris passed to openDialog', async () => {
    const code = `foo.openDialog("/foo/bar/");
                foo.openDialog("chrome://foo.com/bar/");
                foo.openDialog("bar");
                foo.openDialog("resource://foo.com/bar/")`;
    const jsScanner = new JavaScriptScanner(code, 'goodcode.js');

    const { linterMessages } = await runJsScanner(jsScanner);
    expect(linterMessages.length).toEqual(0);
  });
});
