import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import { ONLY_PREFS_IN_DEFAULTS } from 'messages/javascript';

describe('complex_prefs_defaults', () => {
  it('should pass when only calling pref', () => {
    var code = 'pref();';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should pass when only calling user_pref', () => {
    var code = 'user_pref();';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should pass when calling pref as a root expression', () => {
    var code = 'pref().bar;';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should pass when calling pref with chained functions', () => {
    var code = 'pref().foo().bar().baz;';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should fail due to calling not pref() or user_pref()', () => {
    var code = 'foo()';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        assert.equal(validationMessages[0].code, ONLY_PREFS_IN_DEFAULTS.code);
      });
  });

  it('should fail if pref() is not called as a global', () => {
    var code = 'foo.pref()';
    var jsScanner = new JavaScriptScanner(code, 'defaults/preferences/pref.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        assert.equal(validationMessages[0].code, ONLY_PREFS_IN_DEFAULTS.code);
      });
  });
});
