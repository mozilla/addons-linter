import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import { NO_IMPLIED_EVAL } from 'messages';

import { runJsScanner } from '../../helpers';

// These rules were mostly copied and adapted from
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-implied-eval.js
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_implied_eval', () => {
  const expectedErrorMessage =
    'Implied eval. Consider passing a function instead of a string.';

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

  validCodes.forEach((code) => {
    it(`should not throw false positives for implied-eval: ${code}`, async () => {
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });
  });

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
      // eslint-disable-next-line no-template-curly-in-string
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

  it.each(invalidCodes)(
    `should not allow the use of eval: %o`,
    async (code) => {
      const jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      linterMessages.sort();

      expect(linterMessages.length).toEqual(code.message.length);

      code.message.forEach((expectedMessage, idx) => {
        expect(linterMessages[idx].code).toEqual(NO_IMPLIED_EVAL.code);
        expect(linterMessages[idx].message).toEqual(expectedMessage);
        expect(linterMessages[idx].type).toEqual(VALIDATION_WARNING);
      });

      code.description.forEach((expectedDescription, idx) => {
        expect(linterMessages[idx].description).toEqual(expectedDescription);
      });
    }
  );
});
