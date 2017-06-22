import ESLint from 'eslint';

import {
  DEPRECATED_APIS, ESLINT_ERROR, ESLINT_RULE_MAPPING, TEMPORARY_APIS,
  VALIDATION_ERROR, VALIDATION_WARNING,
  EXTERNAL_RULE_MAPPING,
} from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';
import { rules } from 'rules/javascript';
import { apiToMessage, singleLineString } from 'utils';
import { fakeMessageData, getRuleFiles, getVariable, unexpectedSuccess,
         validMetadata } from '../helpers';

describe('JavaScript Scanner', function() {

  it('should report a proper scanner name', () => {
    expect(JavaScriptScanner.scannerName).toEqual('javascript');
  });

  it('should thrown an error without a filename', () => {
    expect(() => {
      var jsScanner = new JavaScriptScanner(''); // eslint-disable-line
    }).toThrow('Filename is required');
  });

  it('should have an options property', () => {
    var jsScanner = new JavaScriptScanner('', 'filename.txt');
    expect(typeof jsScanner.options).toEqual('object');
    // This test assures us the options can be accessed like an object.
    expect(typeof jsScanner.options.someUndefinedProp).toEqual('undefined');

    var jsScannerWithOptions = new JavaScriptScanner('', 'filename.txt', {
      foo: 'bar',
    });
    expect(jsScannerWithOptions.options.foo).toEqual('bar');
  });

  it('should pass when async/await is used', () => {
    var code = 'var foo = async a => a;';
    var jsScanner = new JavaScriptScanner(code, 'code.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should create an error message when encountering a syntax error', () => {
    var code = 'var m = "d;';
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages[0].code).toEqual(messages.JS_SYNTAX_ERROR.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);

        // Test another error for good measure.
        code = 'var aVarThatDoesnt != exist;';
        jsScanner = new JavaScriptScanner(code, 'badcode.js');

        return jsScanner.scan()
          .then(({linterMessages: moreValidationMessages}) => {
            expect(moreValidationMessages[0].code).toEqual(
              messages.JS_SYNTAX_ERROR.code);
            expect(moreValidationMessages[0].type).toEqual(
              VALIDATION_ERROR);
          });
      });
  });

  it('should reject on missing message code', () => {
    var FakeCLIEngine = function() {};
    FakeCLIEngine.prototype = {
      constructor: function() {},
      executeOnText: () => {
        return {
          results: [{
            filePath: 'badcode.js',
            messages: [{
              fatal: false,
            }],
          }],
        };
      },
    };

    var FakeESLint = {
      linter: {
        defineRule: () => {
          // no-op
        },
      },
      CLIEngine: FakeCLIEngine,
    };

    var jsScanner = new JavaScriptScanner('whatever', 'badcode.js');

    return jsScanner.scan(FakeESLint)
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('JS rules must pass a valid message');
      });
  });

  it('ignores /*eslint-disable*/ comments', () => {
    var code = singleLineString`/*eslint-disable*/
                                var myDatabase = indexeddb || mozIndexedDB;`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.MOZINDEXEDDB.code);
      });
  });

  it('ignores // eslint-disable-line comments', () => {
    var code = singleLineString`var myDatabase = indexeddb || mozIndexedDB;
                                // eslint-disable-line`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.MOZINDEXEDDB.code);
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
          expect(windowVar.eslintExplicitGlobal).toBeFalsy();

          ok = true;
        },
      };
    }});

    eslint.verify('/*eslint-env browser*/', config, {allowInlineConfig: false});
    expect(ok).toBeTruthy();
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
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
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
          expect(foo).toBeFalsy();

          ok = true;
        },
      };
    }});

    eslint.verify('/* global foo */', config, {allowInlineConfig: false});
    expect(ok).toBeTruthy();
  });

  it('should pass addon metadata to rules', () => {
    var fakeRules = { 'metadata-not-passed': { create: () => {} } };

    var fakeMessages = {
      METADATA_NOT_PASSED: Object.assign({}, fakeMessageData, {
        code: 'METADATA_NOT_PASSED',
        legacyCode: null,
        message: 'Should not happen',
        description: 'Should not happen',
      }),
    };
    var fakeMetadata = { addonMetadata: validMetadata({guid: 'snowflake'}) };
    var fakeESLintMapping = { 'metadata-not-passed': ESLINT_ERROR };

    sinon.stub(
      fakeRules['metadata-not-passed'], 'create'
    ).callsFake((context) => {
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
      sinon.assert.calledOnce(fakeRules['metadata-not-passed'].create);
    });
  });

  it('should export all rules in rules/javascript', () => {
    // We skip the "run" check here for now as that's handled by ESLint.
    var ruleFiles = getRuleFiles('javascript');
    var externalRulesCount = Object.keys(EXTERNAL_RULE_MAPPING).length;

    expect(ruleFiles.length + externalRulesCount).toEqual(
      Object.keys(ESLINT_RULE_MAPPING).length);

    var jsScanner = new JavaScriptScanner('', 'badcode.js');

    return jsScanner.scan()
      .then(() => {
        expect(jsScanner._rulesProcessed).toEqual(Object.keys(rules).length);
      });
  });

  for (let api of DEPRECATED_APIS) {
    it(`should return warning when ${api} is used`, () => {
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js');

      return jsScanner.scan()
        .then(({linterMessages}) => {
          expect(linterMessages.length).toEqual(1);
          expect(linterMessages[0].code).toEqual(apiToMessage(api));
          expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        });
    });
  }

  for (let api of TEMPORARY_APIS) {
    it(`should return warning when ${api} is used with no id`, () => {
      var fakeMetadata = { addonMetadata: validMetadata({}) };
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then(({linterMessages}) => {
          expect(linterMessages.length).toEqual(1);
          expect(linterMessages[0].code).toEqual(apiToMessage(api));
          expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        });
    });
  }

  for (let api of TEMPORARY_APIS) {
    it(`should pass when ${api} is used with an id`, () => {
      var fakeMetadata = { addonMetadata: validMetadata({id: 'snark'}) };
      var jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then(({linterMessages}) => {
          expect(linterMessages.length).toEqual(0);
        });
    });
  }

  it('treats a non-code string message as the message', () => {
    var _rules = {
      'message-rule': (context) => {
        return {
          MemberExpression(node) {
            context.report(node, 'this is the message');
          },
        };
      },
    };
    var _ruleMapping = { 'message-rule': ESLINT_ERROR };
    var fakeMetadata = { addonMetadata: validMetadata({}) };
    var jsScanner = new JavaScriptScanner('foo.bar', 'code.js', fakeMetadata);

    return jsScanner.scan(undefined, { _rules, _ruleMapping })
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual('this is the message');
        expect(linterMessages[0].message).toEqual('this is the message');
      });
  });
});
