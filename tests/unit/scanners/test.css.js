import { oneLine } from 'common-tags';

import { VALIDATION_WARNING } from 'linter/const';
import { ignorePrivateFunctions } from 'linter/utils';
import * as messages from 'messages';
import CSSScanner from 'scanners/css';
import * as rules from 'rules/css';

import { getRuleFiles, metadataPassCheck, validMetadata } from '../helpers';

describe('CSSScanner', () => {
  it('should report a proper scanner name', () => {
    expect(CSSScanner.scannerName).toEqual('css');
  });

  it('should add CSS_SYNTAX_ERROR with invalid css', async () => {
    const code = '#something {';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.CSS_SYNTAX_ERROR.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    expect(linterMessages[0].message).toEqual('Unclosed block');
    expect(linterMessages[0].line).toEqual(1);
    expect(linterMessages[0].column).toEqual(1);
    expect(linterMessages[0].file).toEqual('fakeFile.css');
  });

  it('should pass metadata to rules', async () => {
    const code = oneLine`/* whatever code */
      #myName { position: relative; }
      .myClass { background: #000; }`;
    const fakeRules = { metadataPassedCheck: () => {} };

    // This rule calls assert.fail() if no metadata is passed to it.
    sinon.stub(fakeRules, 'metadataPassedCheck').callsFake(metadataPassCheck);

    const cssScanner = new CSSScanner(code, 'fake.css', {
      addonMetadata: validMetadata({ guid: 'snowflake' }),
    });

    const { linterMessages } = await cssScanner.scan(fakeRules);
    sinon.assert.calledTwice(fakeRules.metadataPassedCheck);
    expect(linterMessages.length).toEqual(0);
  });

  it('should reject if parser throws non-error', async () => {
    const code = '/* whatever code */';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const fakeCSSParser = {
      parse: () => {
        throw new TypeError('Awooga');
      },
    };

    // We load the fake CSS parser into the scanner the only way possible:
    // using the private _getContents method, which will take an alternate
    // parser.
    await expect(cssScanner._getContents(fakeCSSParser)).rejects.toThrow(
      'Awooga'
    );
  });

  it('should export and run all rules in rules/css', async () => {
    const ruleFiles = getRuleFiles('css');
    const code = oneLine`/* whatever code */
      #myName { position: relative; }
      .myClass { background: #000; }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length
    );

    await cssScanner.scan();
    expect(cssScanner._rulesProcessed).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length
    );
  });

  it('should not blow-up on empty media query', async () => {
    const code = '@media only screen and (max-width: 959px) {}';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  // See: https://github.com/mozilla/addons-linter/issues/693
  it('should not blow-up on `initial` value', async () => {
    const code = '.myClass { -moz-binding: url(initial); }';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });
});
