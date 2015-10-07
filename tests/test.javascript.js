import { VALIDATION_ERROR, VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'javascript';
import * as messages from 'messages';
import { singleLineString } from 'utils';


describe('JS Code Checker', function() {

  it('should not allow mozIndexedDB', () => {
    var code = 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.MOZINDEXEDDB.code);
        assert.equal(validationMessages[0].severity, VALIDATION_ERROR);
      });
  });

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
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
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
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is used as a literal', () => {
    var code = 'var foo = "mozIndexedDB"; var myDatabase = window[foo];';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id,
                     messages.MOZINDEXEDDB_PROPERTY.code);
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  // TODO: Not sure how to test for this one yet; it's pretty messy.
  it.skip(singleLineString`should warn when mozIndexedDB is assembled into
    literal with +=`,
  () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      foo += "zIndexedDB";
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB_possible');
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal', () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      foo = foo + "zIndexedDB";
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB_possible');
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal (2)', () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      var test = "zIndexedDB";
      foo = foo + test;
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB_possible');
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal (3)', () => {
    var code = singleLineString`var m = "m";
      var o = "o";
      var z = "z";
      var idb = "IndexedDB";
      var tricksterVariable = m + o + z + idb;
      var myDatabase = window[tricksterVariable];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB_possible');
        assert.equal(validationMessages[0].severity, VALIDATION_WARNING);
      });
  });

  // Depends on: https://github.com/mozilla/addons-validator/issues/7
  it.skip('ignores /*eslint-disable*/ comments', () => {
    var code = '/*eslint-disable*/\n';
    code += 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB');
      });
  });
});
