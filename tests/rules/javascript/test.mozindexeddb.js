import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('mozindexeddb', () => {
  it('should warn about mozIndexedDB', () => {
    var code = 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code, messages.MOZINDEXEDDB.code);
        assert.equal(linterMessages[0].type, VALIDATION_WARNING);
      });
  });

});
