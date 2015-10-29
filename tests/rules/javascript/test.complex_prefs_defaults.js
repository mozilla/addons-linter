import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import { COMPLEX_PREFS_DEFAULTS } from 'messages/javascript';

describe('complex_prefs_defaults', () => {
  it('should pass when only calling pref', () => {
    var code = 'pref();';
    var jsScanner = new JavaScriptScanner(code,
                                          'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should fail due to complex code', () => {
    var code = 'foo.pref()';
    var jsScanner = new JavaScriptScanner(code,
                                          'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        assert.equal(validationMessages[0].code, COMPLEX_PREFS_DEFAULTS.code);
      });
  });

  it('should fail due to calling not pref() or user_pref()', () => {
    var code = 'foo()';
    var jsScanner = new JavaScriptScanner(code,
                                          'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        assert.equal(validationMessages[0].code, COMPLEX_PREFS_DEFAULTS.code);
      });
  });
});
