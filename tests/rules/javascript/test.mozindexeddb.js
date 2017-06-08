import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('mozindexeddb', () => {
  it('should warn about mozIndexedDB', () => {
    var code = 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.MOZINDEXEDDB.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

});
