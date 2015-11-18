import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('mozindexeddb_property', () => {

  // Warn here, as it's possible to have a property named "mozIndexedDB" that
  // isn't referencing window.mozIndexedDB. The add-on reviewer can manually
  // check this. It should NOT output an error.
  it('should warn when mozIndexedDB is used as a property', () => {
    var code = 'var myDatabase = window.mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.MOZINDEXEDDB_PROPERTY.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should warn when mozIndexedDB is a square-bracket key', () => {
    var code = 'var myDatabase = window["mozIndexedDB"];';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.MOZINDEXEDDB_PROPERTY.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should warn when mozIndexedDB is used as a literal', () => {
    var code = 'var foo = "mozIndexedDB"; var myDatabase = window[foo];';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.MOZINDEXEDDB_PROPERTY.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
