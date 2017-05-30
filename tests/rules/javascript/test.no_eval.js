import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import { DANGEROUS_EVAL } from 'messages';

// These rules were mostly copied and adapted from
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-eval.js
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_eval', () => {
  var validCodes = [
    'Eval(foo)',

    // User-defined eval methods.
    'class A { foo() { this.eval(); } }',
    'class A { static foo() { this.eval(); } }',
    'function foo() { "use strict"; this.eval("foo"); }',
    'function foo() { var eval = "foo"; global[eval]("foo") }',
    'function foo() { var eval = "foo"; window[eval]("foo") }',
    'global.eval("foo")',
    'global.noeval("foo")',
    'this.noeval("foo");',
    'var obj = {foo: function() { this.eval("foo"); }}',
    'var obj = {}; obj.foo = function() { this.eval("foo"); }',
    'window.noeval("foo")',
  ];

  for (const code of validCodes) {
    it(`should allow the use of user defined eval: ${code}`, () => {
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then(({linterMessages}) => {
          assert.equal(linterMessages.length, 0);
        });
    });
  }


  var invalidCodes = [
    {
      code: '(0, eval)("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: '(0, window.eval)("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: '(0, window["eval"])("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: '(function(exe){ exe("foo") })(eval);',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'eval("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'eval(foo)',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'function foo() { this.eval("foo") }',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'function foo(eval) { eval("foo") }',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'this.eval("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'var EVAL = eval; EVAL("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'var EVAL = this.eval; EVAL("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'window.eval("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'window.window.eval("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
    {
      code: 'window.window["eval"]("foo")',
      message: ['eval can be harmful.'],
      description: [DANGEROUS_EVAL.description],
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use of eval: ${code.code}`, () => {
      var jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      return jsScanner.scan()
        .then(({linterMessages}) => {
          linterMessages = linterMessages.sort();

          assert.equal(linterMessages.length, code.message.length);

          code.message.forEach((expectedMessage, idx) => {
            assert.equal(linterMessages[idx].message, expectedMessage);
            assert.equal(linterMessages[idx].type, VALIDATION_WARNING);
          });

          code.description.forEach((expectedDescription, idx) => {
            assert.equal(
              linterMessages[idx].description, expectedDescription);
          });
        });
    });
  }
});
