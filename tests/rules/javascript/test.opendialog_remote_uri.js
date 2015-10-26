import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('opendialog_remote_uri', () => {

  it('should warn on remote uris passed to openDialog', () => {
    var code = `foo.openDialog("https://foo.com/bar/");
                foo.openDialog("http://foo.com/bar/");
                foo.openDialog("ftps://foo.com/bar/");
                foo.openDialog("ftp://foo.com/bar/");
                foo.openDialog("//foo.com/bar/");
                foo.openDialog("data:whatever");`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 6);
        for (let message of validationMessages) {
          assert.equal(message.code,
                       messages.OPENDIALOG_REMOTE_URI.code);
          assert.equal(message.type, VALIDATION_WARNING);
        }
      });
  });

  it('should not warn on local uris passed to openDialog', () => {
    var code = `foo.openDialog("/foo/bar/");
                foo.openDialog("chrome://foo.com/bar/");
                foo.openDialog("bar");
                foo.openDialog("resource://foo.com/bar/")`;
    var jsScanner = new JavaScriptScanner(code, 'goodcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

});
