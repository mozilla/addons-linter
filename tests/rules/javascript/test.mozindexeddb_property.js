import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('mozindexeddb_property', () => {
  // Warn here, as it's possible to have a property named "mozIndexedDB" that
  // isn't referencing window.mozIndexedDB. The add-on reviewer can manually
  // check this. It should NOT output an error.
  it('should warn when mozIndexedDB is used as a property', async () => {
    const code = 'var myDatabase = window.mozIndexedDB;';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(
      messages.MOZINDEXEDDB_PROPERTY.code
    );
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should warn when mozIndexedDB is a square-bracket key', async () => {
    const code = 'var myDatabase = window["mozIndexedDB"];';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(
      messages.MOZINDEXEDDB_PROPERTY.code
    );
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  // ??? the code for Identifier node actually cathes
  // var foo = "mozIndexedDB" without calling window[foo]
  it('should warn when mozIndexedDB is used as a literal', () => {
    const code = 'var foo = "mozIndexedDB"; var myDatabase = window[foo];';
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.MOZINDEXEDDB_PROPERTY.code
        );
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });
});
