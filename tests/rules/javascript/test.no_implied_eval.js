import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';
import JavaScriptScanner from 'scanners/javascript';
import { NO_IMPLIED_EVAL } from 'messages';


// These rules were mostly copied and adapted from eslint.
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_implied_eval', () => {
  const expectedErrorMessage = singleLineString`
    Implied eval. Consider passing a function instead of a string.`;

  const validCodes = [
    // normal usage
    'setInterval(function() { x = 1; }, 100);',

    // only checks on top-level statements or window.*
    'foo.setTimeout("hi")',

    // identifiers are fine
    'setTimeout(foo, 10)',
    'var foo = function() {}; setTimeout(foo, 10)',

    // as are function expressions
    'setTimeout(function() {}, 10)',

    // and arrow functions work too
    'setTimeout(() => { console.log("foo"); })',

    // setInterval
    'foo.setInterval("hi")',
    'setInterval(foo, 10)',
    'setInterval(function() {}, 10)',

    // execScript
    'foo.execScript("hi")',
    'execScript(foo)',
    'execScript(function() {})',

    // a binary plus on non-strings doesn't guarantee a string
    'setTimeout(foo + bar, 10)',

    // doesn't check anything but the first argument
    'setTimeout(foobar, "buzz")',
    'setTimeout(foobar, foo + "bar")',

    // only checks immediate subtrees of the argument
    'setTimeout(function() { return "foobar"; }, 10)',

    // https://github.com/eslint/eslint/issues/7821
    'setTimeoutFooBar("Foo Bar")',
  ];

  for (const code of validCodes) {
    it(`should not throw false positives for implied-eval: ${code}`, () => {
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }

  const invalidCodes = [
    {
      code: 'setTimeout("x = 1;");',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'setTimeout("x = 1;", 100);',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'setInterval("x = 1;");',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'execScript("x = 1;");',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },

    // member expressions
    {
      code: 'window.setTimeout("foo")',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'window.setInterval("foo")',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'window["setTimeout"]("foo")',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'window["setInterval"]("foo")',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },

    // template literals
    {
      code: 'setTimeout(`foo${bar}`)',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },

    // string concatenation
    {
      code: 'setTimeout("foo" + bar)',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'setTimeout(foo + "bar")',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'setTimeout(`foo` + bar)',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
    {
      code: 'setTimeout(1 + ";" + 1)',
      message: [expectedErrorMessage],
      description: [NO_IMPLIED_EVAL.description],
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use of eval: ${code.code}`, () => {
      const jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

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
