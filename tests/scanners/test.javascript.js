import ESLint from 'eslint';

import { DEPRECATED_APIS, ESLINT_ERROR, ESLINT_RULE_MAPPING, TEMPORARY_APIS,
         VALIDATION_ERROR, VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';
import * as rules from 'rules/javascript';
import { apiToMessage, ignorePrivateFunctions, singleLineString } from 'utils';
import { fakeMessageData, getRuleFiles, getVariable, unexpectedSuccess,
         validMetadata } from '../helpers';

describe('JavaScript Scanner', function() {

  it('should thrown an error without a filename', () => {
    assert.throws(() => {
      var jsScanner = new JavaScriptScanner(''); // eslint-disable-line
    }, Error, 'Filename is required');
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

  it('ignores /*eslint-disable*/ comments', () => {
    var code = singleLineString`/*eslint-disable*/
                                var myDatabase = indexeddb || mozIndexedDB;`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.MOZINDEXEDDB.code);
      });
  });

  it('ignores // eslint-disable-line comments', () => {
    var code = singleLineString`var myDatabase = indexeddb || mozIndexedDB;
                                // eslint-disable-line`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code, messages.MOZINDEXEDDB.code);
      });
  });

  // This should not cause a syntax error; it should still be parsing code
  // as ES6 because it ignores the env change.
  it('ignores /*eslint-env*/', function() {
    var eslint = ESLint.linter;
    var config = { rules: { test: 2 } };
    var ok = false;

    eslint.defineRules({test: function(context) {
      return {
        Program: function() {
          var windowVar = getVariable(context.getScope(), 'window');
          assert.notOk(windowVar.eslintExplicitGlobal);

          ok = true;
        },
      };
    }});

    eslint.verify('/*eslint-env browser*/', config, {allowInlineConfig: false});
    assert(ok);
  });

  // This is just a precaution against disabling environments in ESLint, which
  // isn't allowed as of writing, but will warn us if it ever happens :-)
  it('ignores /*eslint-env*/ comments', () => {
    var code = singleLineString`/*eslint-env es6:false*/
      var makeBigger = (number) => {
        return number + 1;
      }`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  // This test is pretty much copied from ESLint, to make sure dependencies
  // don't change behaviour on us.
  // https://github.com/mozilla/addons-linter/pull/98#issuecomment-158890847
  it('ignores /*global foo*/', () => {
    var eslint = ESLint.linter;
    var config = { rules: { test: 2 } };
    var ok = false;

    eslint.defineRules({test: function(context) {
      return {
        Program: function() {
          var foo = getVariable(context.getScope(), 'foo');
          assert.notOk(foo);

          ok = true;
        },
      };
    }});

    eslint.verify('/* global foo */', config, {allowInlineConfig: false});
    assert(ok);
  });

  it('should pass addon metadata to rules', () => {
    var fakeRules = { metadata_not_passed: () => {} };

    var fakeMessages = {
      METADATA_NOT_PASSED: Object.assign({}, fakeMessageData, {
        code: 'METADATA_NOT_PASSED',
        legacyCode: null,
        message: 'Should not happen',
        description: 'Should not happen',
      }),
    };
    var fakeMetadata = { addonMetadata: validMetadata({guid: 'snowflake'}) };
    var fakeESLintMapping = { metadata_not_passed: ESLINT_ERROR };

    // Create a rule that
    sinon.stub(fakeRules, 'metadata_not_passed', (context) => {
      return {
        Identifier: () => {
          var metadata = context.settings.addonMetadata;

          if (typeof metadata !== 'object') {
            assert.fail(null, null, 'Metadata should be an object.');
          }

          if (metadata.guid !== 'snowflake') {
            assert.fail(null, null, 'Metadata properties not present.');
          }
        },
      };
    });

    var jsScanner = new JavaScriptScanner('var hello = "something";',
                                          'index.html', fakeMetadata);

    return jsScanner.scan(ESLint, {
      _rules: fakeRules,
      _ruleMapping: fakeESLintMapping,
      _messages: fakeMessages,
    }).then(() => {
      assert.ok(fakeRules.metadata_not_passed.called);
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

  for (let api of DEPRECATED_APIS) {
    it(`should return warning when ${api} is used`, () => {
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code, apiToMessage(api));
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });
  }

  for (let api of TEMPORARY_APIS) {
    it(`should return warning when ${api} is used with no id`, () => {
      var fakeMetadata = { addonMetadata: validMetadata({}) };
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code, apiToMessage(api));
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });
  }

  for (let api of TEMPORARY_APIS) {
    it(`should pass when ${api} is used with an id`, () => {
      var fakeMetadata = { addonMetadata: validMetadata({id: 'snark'}) };
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }
});
