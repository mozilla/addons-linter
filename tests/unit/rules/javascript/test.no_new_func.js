import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import { DANGEROUS_EVAL } from 'messages';

import { runJsScanner } from '../../helpers';

// These rules were mostly copied and adapted from
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-new-func.js
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_new_func', () => {
  const validCodes = [
    'var a = new _function("b", "c", "return b+c");',
    'var a = _function("b", "c", "return b+c");',
  ];

  validCodes.forEach((code) => {
    it(`should allow the use of new func eval: ${code}`, async () => {
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });
  });

  const invalidCodes = [
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

  invalidCodes.forEach((code) => {
    it(`should not allow the use new func eval: ${code.code}`, async () => {
      const jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      linterMessages.sort();

      expect(linterMessages.length).toEqual(code.message.length);

      code.message.forEach((expectedMessage, idx) => {
        expect(linterMessages[idx].code).toEqual(DANGEROUS_EVAL.code);
        expect(linterMessages[idx].message).toEqual(expectedMessage);
        expect(linterMessages[idx].type).toEqual(VALIDATION_WARNING);
      });

      code.description.forEach((expectedDescription, idx) => {
        expect(linterMessages[idx].description).toEqual(expectedDescription);
      });
    });
  });
});
