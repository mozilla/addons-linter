import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import { DANGEROUS_EVAL } from 'messages';

// These rules were mostly copied and adapted from
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-new-func.js
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_new_func', () => {
  var validCodes = [
    'var a = new _function("b", "c", "return b+c");',
    'var a = _function("b", "c", "return b+c");',
  ];

  for (const code of validCodes) {
    it(`should allow the use of new func eval: ${code}`, () => {
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }

  var invalidCodes = [
    {
      code: 'var a = new Function("b", "c", "return b+c");',
      message: ['The Function constructor is eval.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'var a = Function("b", "c", "return b+c");',
      message: ['The Function constructor is eval.'],
      description: [DANGEROUS_EVAL.description],
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use new func eval: ${code.code}`, () => {
      var jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          validationMessages = validationMessages.sort();

          assert.equal(validationMessages.length, code.message.length);

          code.message.forEach((expectedMessage, idx) => {
            assert.equal(validationMessages[idx].message, expectedMessage);
            assert.equal(validationMessages[idx].type, VALIDATION_WARNING);
          });

          code.description.forEach((expectedDescription, idx) => {
            assert.equal(
              validationMessages[idx].description, expectedDescription);
          });
        });
    });
  }
});
