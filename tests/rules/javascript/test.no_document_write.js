import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';

describe('no_document_write', () => {
  it('should warn about using document.write()', () => {
    var code = 'document.write("<h1>foobarbaz</h1>");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.NO_DOCUMENT_WRITE.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should know when a variable references document', () => {
    var code = singleLineString`var foo = document;
      foo.write("<h1>foobarbaz<h1>");`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.NO_DOCUMENT_WRITE.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not warn about using other member functions', () => {
    var code = 'document.doNothing("<h1>foobarbaz</h1>");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not warn about calling write in general', () => {
    var code = 'foo.write("<h1>foobarbaz</h1>");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not warn about calling write to a non-global document', () => {
    var code = 'foo.document.write("<h1>foobarbaz</h1>");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not warn about calling write to non member of document', () => {
    var code = 'document.foo.write("<h1>foobarbaz</h1>");';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });
});
