import { VALIDATION_ERROR } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('mozIndexedDB', () => {
  it('should not allow mozIndexedDB', () => {
    var code = 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.MOZINDEXEDDB.code);
        assert.equal(validationMessages[0].type, VALIDATION_ERROR);
      });
  });

});
