import ESLint from 'eslint';

import {
  DEPRECATED_APIS,
  ESLINT_ERROR,
  ESLINT_RULE_MAPPING,
  EXTERNAL_RULE_MAPPING,
  TEMPORARY_APIS,
  VALIDATION_ERROR,
  VALIDATION_WARNING,
} from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';
import { rules } from 'rules/javascript';
import { apiToMessage, singleLineString } from 'utils';

import {
  fakeMessageData,
  getRuleFiles,
  getVariable,
  unexpectedSuccess,
  validMetadata,
} from '../helpers';


describe('JavaScript Scanner', () => {
  it('should report a proper scanner name', () => {
    expect(JavaScriptScanner.scannerName).toEqual('javascript');
  });

  it('should thrown an error without a filename', () => {
    expect(() => {
      var jsScanner = new JavaScriptScanner(''); // eslint-disable-line
    }).toThrow('Filename is required');
  });

  it('should have an options property', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt');
    expect(typeof jsScanner.options).toEqual('object');
    // This test assures us the options can be accessed like an object.
    expect(typeof jsScanner.options.someUndefinedProp).toEqual('undefined');

    const jsScannerWithOptions = new JavaScriptScanner('', 'filename.txt', {
      foo: 'bar',
    });
    expect(jsScannerWithOptions.options.foo).toEqual('bar');
  });

  it('should pass when async/await is used', () => {
    const code = 'var foo = async a => a;';
    const jsScanner = new JavaScriptScanner(code, 'code.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should create an error message when encountering a syntax error', () => {
    let code = 'var m = "d;';
    let jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages[0].code).toEqual(messages.JS_SYNTAX_ERROR.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);

        // Test another error for good measure.
        code = 'var aVarThatDoesnt != exist;';
        jsScanner = new JavaScriptScanner(code, 'badcode.js');

        return jsScanner.scan()
          .then(({ linterMessages: moreValidationMessages }) => {
            expect(moreValidationMessages[0].code).toEqual(
              messages.JS_SYNTAX_ERROR.code);
            expect(moreValidationMessages[0].type).toEqual(
              VALIDATION_ERROR);
          });
      });
  });

  it('should reject on missing message code', () => {
    const FakeCLIEngine = () => {};
    FakeCLIEngine.prototype = {
      constructor() {},
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

    const FakeESLint = {
      linter: {
        defineRule: () => {
          // no-op
        },
      },
      CLIEngine: FakeCLIEngine,
    };

    const jsScanner = new JavaScriptScanner('whatever', 'badcode.js');

    return jsScanner.scan(FakeESLint)
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('JS rules must pass a valid message');
      });
  });

  it('ignores /*eslint-disable*/ comments', () => {
    const code = singleLineString`/*eslint-disable*/
                                var myDatabase = indexeddb || mozIndexedDB;`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.MOZINDEXEDDB.code);
      });
  });

  it('ignores // eslint-disable-line comments', () => {
    const code = singleLineString`var myDatabase = indexeddb || mozIndexedDB;
                                // eslint-disable-line`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.MOZINDEXEDDB.code);
      });
  });

  // This should not cause a syntax error; it should still be parsing code
  // as ES6 because it ignores the env change.
  it('ignores /*eslint-env*/', () => {
    const eslint = ESLint.linter;
    const config = { rules: { test: 2 } };
    let ok = false;

    eslint.defineRules({ test(context) {
      return {
        Program() {
          const windowVar = getVariable(context.getScope(), 'window');
          expect(windowVar.eslintExplicitGlobal).toBeFalsy();

          ok = true;
        },
      };
    } });

    eslint.verify('/*eslint-env browser*/', config, { allowInlineConfig: false });
    expect(ok).toBeTruthy();
  });

  // This is just a precaution against disabling environments in ESLint, which
  // isn't allowed as of writing, but will warn us if it ever happens :-)
  it('ignores /*eslint-env*/ comments', () => {
    const code = singleLineString`/*eslint-env es6:false*/
      var makeBigger = (number) => {
        return number + 1;
      }`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  // This test is pretty much copied from ESLint, to make sure dependencies
  // don't change behaviour on us.
  // https://github.com/mozilla/addons-linter/pull/98#issuecomment-158890847
  it('ignores /*global foo*/', () => {
    const eslint = ESLint.linter;
    const config = { rules: { test: 2 } };
    let ok = false;

    eslint.defineRules({ test(context) {
      return {
        Program() {
          const foo = getVariable(context.getScope(), 'foo');
          expect(foo).toBeFalsy();

          ok = true;
        },
      };
    } });

    eslint.verify('/* global foo */', config, { allowInlineConfig: false });
    expect(ok).toBeTruthy();
  });

  it('should pass addon metadata to rules', () => {
    const fakeRules = { 'metadata-not-passed': { create: () => {} } };

    const fakeMessages = {
      METADATA_NOT_PASSED: Object.assign({}, fakeMessageData, {
        code: 'METADATA_NOT_PASSED',
        legacyCode: null,
        message: 'Should not happen',
        description: 'Should not happen',
      }),
    };
    const fakeMetadata = { addonMetadata: validMetadata({ guid: 'snowflake' }) };
    const fakeESLintMapping = { 'metadata-not-passed': ESLINT_ERROR };

    sinon.stub(
      fakeRules['metadata-not-passed'], 'create'
    ).callsFake((context) => {
      return {
        Identifier: () => {
          const metadata = context.settings.addonMetadata;

          if (typeof metadata !== 'object') {
            assert.fail(null, null, 'Metadata should be an object.');
          }

          if (metadata.guid !== 'snowflake') {
            assert.fail(null, null, 'Metadata properties not present.');
          }
        },
      };
    });

    const jsScanner = new JavaScriptScanner('var hello = "something";',
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
    const ruleFiles = getRuleFiles('javascript');
    const externalRulesCount = Object.keys(EXTERNAL_RULE_MAPPING).length;

    expect(ruleFiles.length + externalRulesCount).toEqual(
      Object.keys(ESLINT_RULE_MAPPING).length);

    const jsScanner = new JavaScriptScanner('', 'badcode.js');

    return jsScanner.scan()
      .then(() => {
        expect(jsScanner._rulesProcessed).toEqual(Object.keys(rules).length);
      });
  });

  DEPRECATED_APIS.forEach((api) => {
    it(`should return warning when ${api} is used`, () => {
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js');

      return jsScanner.scan()
        .then(({ linterMessages }) => {
          expect(linterMessages.length).toEqual(1);
          expect(linterMessages[0].code).toEqual(apiToMessage(api));
          expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        });
    });
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should return warning when ${api} is used with no id`, () => {
      const fakeMetadata = { addonMetadata: validMetadata({}) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then(({ linterMessages }) => {
          expect(linterMessages.length).toEqual(1);
          expect(linterMessages[0].code).toEqual(apiToMessage(api));
          expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        });
    });
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should pass when ${api} is used with an id`, () => {
      const fakeMetadata = { addonMetadata: validMetadata({ id: 'snark' }) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      return jsScanner.scan()
        .then(({ linterMessages }) => {
          expect(linterMessages.length).toEqual(0);
        });
    });
  });

  it('treats a non-code string message as the message', () => {
    const _rules = {
      'message-rule': (context) => {
        return {
          MemberExpression(node) {
            context.report(node, 'this is the message');
          },
        };
      },
    };
    const _ruleMapping = { 'message-rule': ESLINT_ERROR };
    const fakeMetadata = { addonMetadata: validMetadata({}) };
    const jsScanner = new JavaScriptScanner('foo.bar', 'code.js', fakeMetadata);

    return jsScanner.scan(undefined, { _rules, _ruleMapping })
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual('this is the message');
        expect(linterMessages[0].message).toEqual('this is the message');
      });
  });
});
