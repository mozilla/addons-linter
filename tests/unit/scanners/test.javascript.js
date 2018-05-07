import ESLint from 'eslint';
import { oneLine } from 'common-tags';

import {
  DEPRECATED_APIS,
  ESLINT_ERROR,
  ESLINT_RULE_MAPPING,
  EXTERNAL_RULE_MAPPING,
  TEMPORARY_APIS,
  VALIDATION_ERROR,
  VALIDATION_WARNING,
} from 'const';
import * as messages from 'messages';
import { rules } from 'rules/javascript';
import { apiToMessage } from 'utils';
import JavaScriptScanner, { excludeRules } from 'scanners/javascript';

import {
  fakeMessageData,
  getRuleFiles,
  getVariable,
  validMetadata,
} from '../helpers';

const linterMock = {
  defineRule: (name, options) => ({
    name,
    options,
  }),
};


const esLintMock = {
  CLIEngine: (engineOptions) => {
    return {
      engineOptions,
      linter: linterMock,
      executeOnText: () => ({
        results: [],
      }),
    };
  },
};


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

  it('should not have rules disabled by default', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt');
    expect(jsScanner.disabledRules).toEqual([]);
  });

  it('should be initialised with disabledRules from options', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules: 'no-eval, no-implied-eval,                 no-unsafe-innerhtml/no-unsafe-innerhtml',
    });
    expect(typeof jsScanner.disabledRules).toEqual('object');
    // This test assures us the disabledRules built properly.
    expect(jsScanner.disabledRules).toEqual(['no-eval', 'no-implied-eval', 'no-unsafe-innerhtml/no-unsafe-innerhtml']);
  });

  it('should be initialised with empty excluded rules object, when there is no string', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules: true,
    });
    expect(jsScanner.disabledRules).toEqual([]);
  });

  it('should be initialised with valid rules only', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules: 'no-eval, no-implied-eval,                 no-unsafe-innerhtml/no-unsafe-innerhtml,,,,,',
    });
    expect(jsScanner.disabledRules).toEqual([
      'no-eval',
      'no-implied-eval',
      'no-unsafe-innerhtml/no-unsafe-innerhtml',
    ]);
  });

  it('should pass when async/await is used', async () => {
    const code = 'var foo = async a => a;';
    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should support object spread syntax', async () => {
    const code = oneLine`
      const config = {};
      const actual = {...config, foo: 'bar'};
    `;

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should create an error message when encountering a syntax error', async () => {
    let code = 'var m = "d;';
    let jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages[0].code).toEqual(messages.JS_SYNTAX_ERROR.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_ERROR);

    // Test another error for good measure.
    code = 'var aVarThatDoesnt != exist;';
    jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages: moreValidationMessages } = await jsScanner.scan();
    expect(moreValidationMessages[0].code).toEqual(
      messages.JS_SYNTAX_ERROR.code);
    expect(moreValidationMessages[0].type).toEqual(
      VALIDATION_ERROR);
  });

  it('should reject on missing message code', async () => {
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
      linter: {
        defineRule: () => {
          // no-op
        },
      },
    };

    const FakeESLint = {
      CLIEngine: FakeCLIEngine,
    };

    const jsScanner = new JavaScriptScanner('whatever', 'badcode.js');

    await expect(jsScanner.scan(FakeESLint)).rejects.toThrow(/JS rules must pass a valid message/);
  });

  // This should not cause a syntax error; it should still be parsing code
  // as ES6 because it ignores the env change.
  it('ignores /*eslint-env*/', () => {
    const eslint = ESLint.linter;
    const config = { rules: { test: 2 } };
    let ok = false;

    eslint.defineRules({
      test(context) {
        return {
          Program() {
            const windowVar = getVariable(context.getScope(), 'window');
            expect(windowVar.eslintExplicitGlobal).toBeFalsy();

            ok = true;
          },
        };
      },
    });

    eslint.verify('/*eslint-env browser*/', config, { allowInlineConfig: false });
    expect(ok).toBeTruthy();
  });

  // This is just a precaution against disabling environments in ESLint, which
  // isn't allowed as of writing, but will warn us if it ever happens :-)
  it('ignores /*eslint-env*/ comments', async () => {
    const code = oneLine`/*eslint-env es6:false*/
      var makeBigger = (number) => {
        return number + 1;
      }`;
    const jsScanner = new JavaScriptScanner(code, 'badcode.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  // This test is pretty much copied from ESLint, to make sure dependencies
  // don't change behaviour on us.
  // https://github.com/mozilla/addons-linter/pull/98#issuecomment-158890847
  it('ignores /*global foo*/', () => {
    const eslint = ESLint.linter;
    const config = { rules: { test: 2 } };
    let ok = false;

    eslint.defineRules({
      test(context) {
        return {
          Program() {
            const foo = getVariable(context.getScope(), 'foo');
            expect(foo).toBeFalsy();

            ok = true;
          },
        };
      },
    });

    eslint.verify('/* global foo */', config, { allowInlineConfig: false });
    expect(ok).toBeTruthy();
  });

  it('should pass addon metadata to rules', async () => {
    const fakeRules = { 'metadata-not-passed': { create: () => {} } };

    const fakeMessages = {
      METADATA_NOT_PASSED: Object.assign({}, fakeMessageData, {
        code: 'METADATA_NOT_PASSED',
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

    await jsScanner.scan(ESLint, {
      _rules: fakeRules,
      _ruleMapping: fakeESLintMapping,
      _messages: fakeMessages,
    });

    sinon.assert.calledOnce(fakeRules['metadata-not-passed'].create);
  });

  it('should export all rules in rules/javascript', async () => {
    // We skip the "run" check here for now as that's handled by ESLint.
    const ruleFiles = getRuleFiles('javascript');
    const externalRulesCount = Object.keys(EXTERNAL_RULE_MAPPING).length;

    expect(ruleFiles.length + externalRulesCount).toEqual(
      Object.keys(ESLINT_RULE_MAPPING).length);

    const jsScanner = new JavaScriptScanner('', 'badcode.js');

    await jsScanner.scan();
    expect(jsScanner._rulesProcessed).toEqual(Object.keys(rules).length);
  });

  DEPRECATED_APIS.forEach((api) => {
    it(`should return warning when ${api} is used`, async () => {
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js');

      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(apiToMessage(api));
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should return warning when ${api} is used with no id`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({}) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(apiToMessage(api));
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should pass when ${api} is used with an id`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({ id: 'snark' }) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}(function() {});`, 'code.js', fakeMetadata);

      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages.length).toEqual(0);
    });
  });

  it('treats a non-code string message as the message', async () => {
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

    const { linterMessages } = await jsScanner.scan(undefined, { _rules, _ruleMapping });
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual('this is the message');
    expect(linterMessages[0].message).toEqual('this is the message');
  });

  describe('tests for excludeRules function', () => {
    it('should be a function', () => {
      expect(excludeRules).toBeInstanceOf(Function);
    });

    it('should work without any input', () => {
      expect(excludeRules()).toEqual({});
    });

    it('should work without exclusions', () => {
      expect(excludeRules({
        test: {},
      })).toEqual({
        test: {},
      });
    });

    it('should should exclude test rule', () => {
      expect(excludeRules({
        test: {},
        'next-test': {},
      },
      ['test'])).toEqual({
        'next-test': {},
      });
    });

    it('should work if rule doesnt exist', () => {
      expect(excludeRules({
        test: {},
        'next-test': {},
      }, ['i-dont-exist'])).toEqual({
        test: {},
        'next-test': {},
      });
    });
  });

  describe('scanner options tests', () => {
    it('should define valid set of rules for linter', () => {
      const jsScanner = new JavaScriptScanner('', 'filename.txt', {
        disabledRules: 'no-eval, no-implied-eval,                 no-unsafe-innerhtml/no-unsafe-innerhtml',
      });
      const original = linterMock.defineRule;
      sinon.stub(linterMock, 'defineRule').callsFake(original);
      jsScanner.scan(esLintMock, {
        _rules: {
          test: {},
          'no-eval': {},
        },
        _ruleMapping: {
          test: {},
          'no-eval': {},
        },
      });
      const spyCalls = linterMock.defineRule.getCalls();
      expect(spyCalls.length).toBe(1);
    });
  });
});
