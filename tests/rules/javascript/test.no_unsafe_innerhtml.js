import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';

// These rules were mostly copied and adapted from
// https://github.com/mozfreddyb/eslint-plugin-no-unsafe-innerhtml/
// Please make sure to keep them up-to-date and report upstream errors.

describe('no_unsafe_innerhtml', () => {
  var validCodes = [
    "a.innerHTML = '';",
    'c.innerHTML = ``;',
    'g.innerHTML = Sanitizer.escapeHTML``;',
    'h.innerHTML = Sanitizer.escapeHTML`foo`;',
    'i.innerHTML = Sanitizer.escapeHTML`foo${bar}baz`;',
  ];

  for (const code of validCodes) {
    it(`should allow the use innerHTML equals ${code}`, () => {
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }


  var invalidCodes = [
    {
      code: 'm.innerHTML = htmlString;',
      message: 'Unsafe assignment to innerHTML',
      type: VALIDATION_WARNING,
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use of innerHTML examples ${code.code}`, () => {
      var jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code, code.message);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });
  }
});
