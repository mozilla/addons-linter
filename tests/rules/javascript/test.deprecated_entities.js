import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import { DEPRECATED_ENTITIES } from 'rules/javascript/deprecated_entities';
import JavaScriptScanner from 'scanners/javascript';

describe('deprecated_entities', () => {
  for (let entity of DEPRECATED_ENTITIES) {
    let obj = entity.object;
    let prop = entity.property;

    it(`should warn about using ${obj}.${prop}()`, () => {
      var code = `${obj}.${prop}();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       entity.error.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });

    it(`should know when a variable references ${obj}`, () => {
      var code = singleLineString`var foo = ${obj};
        foo.${prop}();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       entity.error.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });

    it(`should still work with variables aliased to ${obj}.${prop}`, () => {
      var code = `var foo = ${obj}.${prop}; foo();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       entity.error.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });

    it('should not warn about using other member functions', () => {
      var code = `${obj}.doNothing();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });

    it(`should not warn about calling ${prop} in general`, () => {
      var code = `foo.${prop}();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });

    it(`should not warn about calling ${prop} to a non-global ${obj}`, () => {
      var code = `foo.${obj}.${prop}();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });

    it(`should not warn about calling ${prop} to non member of ${obj}`, () => {
      var code = `${obj}.foo.${prop}();`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }
});
