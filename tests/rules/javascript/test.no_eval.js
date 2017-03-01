import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';

// These rules were mostly copied and adapted from
// https://github.com/eslint/eslint/blob/master/tests/lib/rules/no-eval.js
// Please make sure to keep them up-to-date and report upstream errors.
describe('no_eval', () => {
  var validCodes = [
    'Eval(foo)',

    // User-defined eval methods.
    'window.eval("foo")',
    'window.eval("foo")',
    'window.noeval("foo")',
    'function foo() { var eval = "foo"; window[eval]("foo") }',
    'global.eval("foo")',
    'global.eval("foo")',
    'global.noeval("foo")',
    'function foo() { var eval = "foo"; global[eval]("foo") }',
    'this.noeval("foo");',
    'function foo() { "use strict"; this.eval("foo"); }',
    'function foo() { this.eval("foo"); }',
    'function foo() { this.eval("foo"); }',
    'var obj = {foo: function() { this.eval("foo"); }}',
    'var obj = {}; obj.foo = function() { this.eval("foo"); }',
    'class A { foo() { this.eval(); } }',
    'class A { static foo() { this.eval(); } }',

    // Allows indirect eval
    '(0, eval)("foo")',
    '(0, window.eval)("foo")',
    '(0, window["eval"])("foo")',
    'var EVAL = eval; EVAL("foo")',
    'var EVAL = this.eval; EVAL("foo")',
    '(function(exe){ exe("foo") })(eval);',
    'window.eval("foo")',
    'window.window.eval("foo")',
    'window.window["eval"]("foo")',
    'global.eval("foo")',
    'global.global.eval("foo")',
    'this.eval("foo")',
    'function foo() { this.eval("foo") }',
  ];

  for (const code of validCodes) {
    it(`should allow the use of user defined / indirect eval: ${code}`, () => {
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }


  var invalidCodes = [
    {
      code: 'eval(foo)',
      message: ['eval can be harmful.'],
    },
    {
      code: 'eval("foo")',
      message: ['eval can be harmful.'],
    },
    {
      code: 'function foo(eval) { eval("foo") }',
      message: ['eval can be harmful.'],
    },
    {
      code: 'eval(foo)',
      message: ['eval can be harmful.'],
    },
    {
      code: 'eval("foo")',
      message: ['eval can be harmful.'],
    },
    {
      code: 'function foo(eval) { eval("foo") }',
      message: ['eval can be harmful.'],
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use of global eval: ${code.code}`, () => {
      var jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          validationMessages = validationMessages.sort();

          assert.equal(validationMessages.length, code.message.length);

          code.message.forEach((expectedMessage, idx) => {
            assert.equal(validationMessages[idx].message, expectedMessage);
            assert.equal(validationMessages[idx].type, VALIDATION_WARNING);
          });
        });
    });
  }
});
