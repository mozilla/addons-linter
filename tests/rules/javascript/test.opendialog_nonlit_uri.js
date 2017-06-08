import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('opendialog_nonlit_uri', () => {
  it('should provide notice on non-literal uris passed to openDialog', () => {
    var code = `var bar="https://whavever";
                foo.openDialog(bar);`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.OPENDIALOG_NONLIT_URI.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });
});
