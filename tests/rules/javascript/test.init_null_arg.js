import JavaScriptScanner from 'scanners/javascript';
import { VALIDATION_WARNING } from 'const';
import * as messages from 'messages';

describe('init_null_arg', () => {
  it('should not allow init called with null', () => {
    var code = 'nsITransferable.init(null);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.INIT_NULL_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not allow init called with a null ref', () => {
    var code = 'var foo = null; nsITransferable.init(foo);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.INIT_NULL_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should allow init called with a non-null arg', () => {
    var code = 'nsITransferable.init();';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not allow init called with an aliased varaible and null', () => {
    var code = 'var foo = nsITransferable; foo.init(null);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.INIT_NULL_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not allow nsITransferable.init called aliased with null', () => {
    var code = 'var foo = nsITransferable.init; foo(null);';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.INIT_NULL_ARG.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should allow nsITransferable.init called aliased without null', () => {
    var code = 'var foo = nsITransferable.init; foo();';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should allow init called with an aliased varaible but not null', () => {
    var code = 'var foo = nsITransferable; foo.init();';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });
});
