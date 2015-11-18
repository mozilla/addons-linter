import { ESLINT_RULE_MAPPING, VALIDATION_ERROR,
         VALIDATION_WARNING } from 'const';
import { MissingFilenameError } from 'exceptions';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';
import * as rules from 'rules/javascript';
import { ignorePrivateFunctions, singleLineString } from 'utils';
import { getRuleFiles, unexpectedSuccess } from '../helpers';


describe('JavaScript Scanner', function() {

  it('should thrown an error without a filename', () => {
    assert.throws(() => {
      var jsScanner = new JavaScriptScanner(''); // eslint-disable-line
    }, MissingFilenameError, 'Filename is required');
  });

  it('should have an options property', () => {
    var jsScanner = new JavaScriptScanner('', 'filename.txt');
    assert.equal(typeof jsScanner.options, 'object');
    // This test assures us the options can be accessed like an object.
    assert.equal(typeof jsScanner.options.someUndefinedProp, 'undefined');

    var jsScannerWithOptions = new JavaScriptScanner('', 'filename.txt', {
      foo: 'bar',
    });
    assert.equal(jsScannerWithOptions.options.foo, 'bar');
  });

  // TODO: Not sure how to test for this one yet; it's pretty messy.
  it.skip(singleLineString`should warn when mozIndexedDB is assembled into
    literal with +=`,
  () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      foo += "zIndexedDB";
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'OBFUSCATION');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal', () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      foo = foo + "zIndexedDB";
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'OBFUSCATION');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal (2)', () => {
    var code = singleLineString`var foo = "m";
      foo += "o";
      var test = "zIndexedDB";
      foo = foo + test;
      var myDatabase = window[foo];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'OBFUSCATION');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it.skip('should warn when mozIndexedDB is assembled into literal (3)', () => {
    var code = singleLineString`var m = "m";
      var o = "o";
      var z = "z";
      var idb = "IndexedDB";
      var tricksterVariable = m + o + z + idb;
      var myDatabase = window[tricksterVariable];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'OBFUSCATION');
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should create an error message when encountering a syntax error', () => {
    var code = 'var m = "d;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages[0].code, messages.JS_SYNTAX_ERROR.code);
        assert.equal(validationMessages[0].type, VALIDATION_ERROR);

        // Test another error for good measure.
        code = 'var aVarThatDoesnt != exist;';
        jsScanner = new JavaScriptScanner(code, 'badcode.js');

        return jsScanner.scan()
          .then((moreValidationMessages) => {
            assert.equal(moreValidationMessages[0].code,
                         messages.JS_SYNTAX_ERROR.code);
            assert.equal(moreValidationMessages[0].type, VALIDATION_ERROR);
          });
      });
  });

  it('should reject on missing message code', () => {

    var FakeESLint = {
      linter: {
        defineRule: () => {
          // no-op
        },
        verify: () => {
          return [{
            fatal: false,
          }];
        },
      },
    };

    var jsScanner = new JavaScriptScanner('whatever', 'badcode.js');

    return jsScanner.scan(FakeESLint)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'JS rules must pass a valid message');
      });
  });

  // Depends on: https://github.com/mozilla/addons-validator/issues/7
  it.skip('ignores /*eslint-disable*/ comments', () => {
    var code = '/*eslint-disable*/\n';
    code += 'var myDatabase = indexeddb || mozIndexedDB;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].id, 'mozIndexedDB');
      });
  });

  it('should export all rules in rules/javascript', () => {
    // We skip the "run" check here for now as that's handled by ESLint.
    var ruleFiles = getRuleFiles('javascript');
    assert.equal(ruleFiles.length, Object.keys(ESLINT_RULE_MAPPING).length);

    var jsScanner = new JavaScriptScanner('', 'badcode.js');

    return jsScanner.scan()
      .then(() => {
        assert.equal(jsScanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });
});
