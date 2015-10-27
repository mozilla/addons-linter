import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('opendialog_nonlit_uri', () => {
  it('should provide notice on non-literal uris passed to openDialog', () => {
    var code = `var bar="https://whavever";
                foo.openDialog(bar);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.OPENDIALOG_NONLIT_URI.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });
});
