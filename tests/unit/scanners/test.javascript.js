import ESLint from 'eslint';
import { oneLine } from 'common-tags';

import {
  ESLINT_ERROR,
  ESLINT_RULE_MAPPING,
  EXTERNAL_RULE_MAPPING,
  TEMPORARY_APIS,
  VALIDATION_ERROR,
  VALIDATION_WARNING,
} from 'const';
import * as messages from 'messages';
import { apiToMessage } from 'utils';
import JavaScriptScanner from 'scanners/javascript';
import Linter from 'linter';

import {
  fakeMessageData,
  getRuleFiles,
  getVariable,
  validMetadata,
  runJsScanner,
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

  it('should not have rules disabled by default', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt');
    expect(jsScanner.disabledRules).toEqual([]);
  });

  it('should be initialised with disabledRules from options', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules:
        'no-eval, no-implied-eval,     no-unsanitized/method, no-unsanitized/property',
    });
    expect(typeof jsScanner.disabledRules).toEqual('object');
    // This test assures us the disabledRules built properly.
    expect(jsScanner.disabledRules).toEqual([
      'no-eval',
      'no-implied-eval',
      'no-unsanitized/method',
      'no-unsanitized/property',
    ]);
  });

  it('should be initialised with empty excluded rules object, when there is no string', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules: true,
    });
    expect(jsScanner.disabledRules).toEqual([]);
  });

  it('should be initialised with valid rules only', () => {
    const jsScanner = new JavaScriptScanner('', 'filename.txt', {
      disabledRules: 'no-eval, no-implied-eval, no-unsanitized-method,,,,,',
    });
    expect(jsScanner.disabledRules).toEqual([
      'no-eval',
      'no-implied-eval',
      'no-unsanitized-method',
    ]);
  });

  it('should pass when async/await is used', async () => {
    const code = 'var foo = async a => a;';
    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support object spread syntax', async () => {
    const code = oneLine`
      const config = {};
      const actual = {...config, foo: 'bar'};
    `;

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support optional chaining', async () => {
    const code = 'const dogName = adventurer.dog?.name;';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support nullish coalescing operator', async () => {
    const code = 'const baz = 0 ?? 42;';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support public class fields', async () => {
    const code = 'class MyClass { a = 1; }';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support BigInt short-hand notation', async () => {
    const code = 'const bigInt = 2166136261n;';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support dynamic imports', async () => {
    const code = `(async () => { await import('some-script.js'); })();`;

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it.each([
    ['chrome.runtime.getURL', 'valid'],
    ['browser.runtime.getURL', 'valid'],
    ['anyOtherUnknownMethod', 'invalid'],
  ])(
    'should consider %s as %s escape for dynamic import calls',
    async (method, expectedResult) => {
      const fakeMetadata = {
        addonMetadata: validMetadata({ guid: 'someext' }),
      };
      const jsScanner = new JavaScriptScanner(
        `(async () => await import (${method}('script.js')))()`,
        'code.js',
        fakeMetadata
      );

      const { linterMessages } = await jsScanner.scan();

      /* eslint-disable jest/no-conditional-expect */
      switch (expectedResult) {
        case 'valid':
          expect(linterMessages).toEqual([]);
          break;
        case 'invalid':
          expect(linterMessages[0]).toMatchObject({
            code: 'UNSAFE_VAR_ASSIGNMENT',
          });
          break;
        default:
          expect(['valid', 'invalid']).toContain(expectedResult);
      }
      /* eslint-enable jest/no-conditional-expect */
    }
  );

  it('should support numeric separators', async () => {
    const code = 'const num = 1_0;';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support es6 modules', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension_es6_module'],
      // This is needed because the fixtures file has data collection permissions
      // and we don't want the `DATA_COLLECTION_PERMISSIONS_PROP_RESERVED` error
      // to be emitted.
      enableDataCollectionPermissions: true,
    });
    addonLinter.print = sinon.stub();

    await addonLinter.scan();
    expect(addonLinter.collector.errors.length).toEqual(0);
    expect(addonLinter.collector.warnings.length).toEqual(0);
  });

  it('should parse as module .mjs files', async () => {
    const code = 'const url = import.meta.url;';

    const jsScanner = new JavaScriptScanner(code, 'code.mjs');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should support optional catch binding', async () => {
    const code = oneLine`
      try {} catch {}
    `;

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([]);
  });

  it('should scan node modules', async () => {
    const code = 'el.innerHTML = evilContent';

    const jsScanner = new JavaScriptScanner(
      code,
      'node_modules/module/code.js'
    );

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages[0]).toMatchObject({ code: 'UNSAFE_VAR_ASSIGNMENT' });
  });

  it('should scan bower components', async () => {
    const code = 'el.innerHTML = evilContent';

    const jsScanner = new JavaScriptScanner(
      code,
      'bower_components/component/code.js'
    );

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages[0]).toMatchObject({ code: 'UNSAFE_VAR_ASSIGNMENT' });
  });

  it('should scan dotfiles', async () => {
    const code = 'el.innerHTML = evilContent';

    const jsScanner = new JavaScriptScanner(code, '.code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages[0]).toMatchObject({ code: 'UNSAFE_VAR_ASSIGNMENT' });
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
      messages.JS_SYNTAX_ERROR.code
    );
    expect(moreValidationMessages[0].type).toEqual(VALIDATION_ERROR);
  });

  it('should reject on missing message code', async () => {
    class FakeLinterClass {
      defineRule() {}

      defineParser() {}

      verify() {
        return [{ fatal: false }];
      }
    }

    const FakeESLint = {
      Linter: FakeLinterClass,
    };

    const jsScanner = new JavaScriptScanner('whatever', 'badcode.js');

    await expect(jsScanner.scan({ _ESLint: FakeESLint })).rejects.toThrow(
      /JS rules must pass a valid message/
    );
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
    expect(linterMessages).toEqual([]);
  });

  // This test is pretty much copied from ESLint, to make sure dependencies
  // don't change behaviour on us.
  // https://github.com/mozilla/addons-linter/pull/98#issuecomment-158890847
  it('ignores /*global foo*/', () => {
    const eslint = new ESLint.Linter({ configType: 'eslintrc' });
    const config = { rules: { test: 2 } };
    let ok = false;

    eslint.defineRules({
      test: {
        create(context) {
          const sourceCode = context.sourceCode ?? context.getSourceCode();

          return {
            Program(node) {
              const scope = sourceCode.getScope
                ? sourceCode.getScope(node)
                : context.getScope();

              const foo = getVariable(scope, 'foo');
              expect(foo).toBeFalsy();

              ok = true;
            },
          };
        },
      },
    });

    eslint.verify('/* global foo */', config, { allowInlineConfig: false });
    expect(ok).toBeTruthy();
  });

  it('should pass addon metadata to rules', async () => {
    const fakeMessages = {
      METADATA_NOT_PASSED: {
        ...fakeMessageData,
        code: 'METADATA_NOT_PASSED',
        message: 'Should not happen',
        description: 'Should not happen',
      },
    };
    const fakeMetadata = {
      addonMetadata: validMetadata({ guid: 'snowflake' }),
    };

    const jsScanner = new JavaScriptScanner(
      'var hello = "something";',
      'index.html',
      fakeMetadata
    );

    const { linterMessages } = await runJsScanner(jsScanner, {
      scanOptions: {
        _messages: fakeMessages,
        _ruleMapping: { 'metadata-not-passed': ESLINT_ERROR },
      },
      fixtureRules: ['metadata-not-passed'],
    });

    expect(linterMessages).toEqual([]);
  });

  it('should export all rules in rules/javascript', async () => {
    // We skip the "run" check here for now as that's handled by ESLint.
    const ruleFiles = getRuleFiles('javascript');
    const externalRulesCount = Object.keys(EXTERNAL_RULE_MAPPING).length;

    expect(ruleFiles.length + externalRulesCount).toEqual(
      Object.keys(ESLINT_RULE_MAPPING).length
    );

    const jsScanner = new JavaScriptScanner('', 'badcode.js');

    await runJsScanner(jsScanner);
    // This is the number of custom ESLint rules we have in addons-linter. When
    // adding a new rule, please increase this value.
    expect(jsScanner._rulesProcessed).toEqual(15);
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should return warning when ${api} is used with no id`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({}) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}();`,
        'code.js',
        fakeMetadata
      );

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(apiToMessage(api));
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });
  });

  TEMPORARY_APIS.forEach((api) => {
    it(`should pass when ${api} is used with an id`, async () => {
      const fakeMetadata = { addonMetadata: validMetadata({ id: 'snark' }) };
      const jsScanner = new JavaScriptScanner(
        `chrome.${api}();`,
        'code.js',
        fakeMetadata
      );

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages).toEqual([]);
    });
  });

  it('treats a non-code string message as the message', async () => {
    const _ruleMapping = { 'message-rule': ESLINT_ERROR };
    const fakeMetadata = { addonMetadata: validMetadata({}) };
    const jsScanner = new JavaScriptScanner('foo.bar', 'code.js', fakeMetadata);

    const { linterMessages } = await runJsScanner(jsScanner, {
      scanOptions: { _ruleMapping },
      fixtureRules: ['message-rule'],
    });
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual('this is the message');
    expect(linterMessages[0].message).toEqual('this is the message');
  });

  it('outputs the parsing errors in the message when possible', async () => {
    const code = `
      export const FOO = "FOO";
      // This will produce a syntax error when parsing the file as module.
      default FOO;
    `;
    const jsScanner = new JavaScriptScanner(code, 'code.js');

    const { linterMessages } = await jsScanner.scan();
    expect(linterMessages).toEqual([
      expect.objectContaining({
        description: expect.stringContaining(oneLine`might be related to some
          experimental JavaScript features that aren't an official part of the
          language specification`),
        message: oneLine`JavaScript syntax error (Parsing as module error:
          Unexpected token default at line: 4 and column: 7) (Parsing as script
          error: 'import' and 'export' may appear only with 'sourceType:
          module' at line: 2 and column: 7)`,
      }),
    ]);
  });

  // See: https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/188
  it('has variable tracing disabled to avoid a bug', async () => {
    // eslint-disable-next-line no-template-curly-in-string
    const code = 'let c; a.innerHTML = `${c}`;';

    const jsScanner = new JavaScriptScanner(code, 'code.js');

    // We are not so much interested in the actual result. This would throw an
    // error because of the bug in the upstream library.
    return expect(jsScanner.scan()).resolves.toEqual({
      linterMessages: [
        expect.objectContaining({ code: 'UNSAFE_VAR_ASSIGNMENT' }),
      ],
      scannedFiles: ['code.js'],
    });
  });

  describe('detectSourceType', () => {
    it('should detect module', async () => {
      const code = oneLine`
        import 'foo';
      `;

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect module (multiple statements)', async () => {
      const code = oneLine`
        let value = 0;
        let [, x] = [, 0];
        export { value };
      `;

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect module (import.meta in .js file)', async () => {
      const code = 'const url = import.meta.url;';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect top level await', async () => {
      const code = 'await Promise.resolve();';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should ignore await in arrow function expression', async () => {
      const code = 'const foo = async () => await Promise.resolve();';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('script');
    });

    it('should ignore await in function declaration', async () => {
      const code = 'async function foo() { await Promise.resolve(); }';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('script');
    });

    it('should ignore await in function expression', async () => {
      const code = 'const foo = async function () { await Promise.resolve(); }';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('script');
    });

    it('should detect module in second child', async () => {
      const code = 'const foo = await Promise.resolve();';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect module in if', async () => {
      const code = 'if (await Promise.resolve(true)) { }';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect module in ternary', async () => {
      const code = 'const foo = true ? (1 && await Promise.resolve()) : 0;';

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('module');
    });

    it('should detect script', async () => {
      const code = oneLine`
        eval('foo');
      `;

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('script');
    });

    it('should default to script in case of SyntaxError', async () => {
      const code = oneLine`
        import foo
      `;

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      await runJsScanner(jsScanner);

      expect(jsScanner.sourceType).toEqual('script');
    });

    it('returns the "parsing as a module" error', async () => {
      const code = `
        export const FOO = "FOO";
        // This will produce a syntax error when parsing the file as module.
        default FOO;
      `;

      const jsScanner = new JavaScriptScanner(code, 'code.js');
      const detectedSourceType = jsScanner.detectSourceType();

      expect(detectedSourceType.sourceType).toEqual('script');
      expect(detectedSourceType.parsingError).toEqual({
        type: 'module',
        error: 'Unexpected token default at line: 4 and column: 9',
      });
    });

    it('should only recurse if the child node is defined', async () => {
      const code = `(function () {})();`;
      const jsScanner = new JavaScriptScanner(code, 'code.js');

      const detectedSourceType = jsScanner.detectSourceType();

      expect(detectedSourceType.sourceType).toEqual('script');
      expect(detectedSourceType.parsingError).toEqual(null);
    });

    it('handles "parsing as a module" errors without line/column', async () => {
      const code = `(function () {})();`;
      const jsScanner = new JavaScriptScanner(code, 'code.js');
      sinon.stub(jsScanner, '_getSourceType').throws(new Error('some error'));

      const detectedSourceType = jsScanner.detectSourceType();

      expect(detectedSourceType.sourceType).toEqual('script');
      expect(detectedSourceType.parsingError).toEqual({
        type: 'module',
        error: oneLine`some error at line: (unknown) and column: (unknown).
          This looks like a bug in addons-linter, please open a new issue:
          https://github.com/mozilla/addons-linter/issues`,
      });
    });
  });
});
