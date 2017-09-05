import { oneLine } from 'common-tags';

import * as messages from 'messages';
import { VALIDATION_WARNING } from 'const';
import CSSScanner from 'scanners/css';
import * as rules from 'rules/css';
import { ignorePrivateFunctions } from 'utils';

import { getRuleFiles, metadataPassCheck, validMetadata } from '../helpers';


describe('CSSScanner', () => {
  it('should report a proper scanner name', () => {
    expect(CSSScanner.scannerName).toEqual('css');
  });

  it('should add CSS_SYNTAX_ERROR with invalid css', () => {
    const code = '#something {';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.CSS_SYNTAX_ERROR.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
        expect(linterMessages[0].message).toEqual('Unclosed block');
        expect(linterMessages[0].line).toEqual(1);
        expect(linterMessages[0].column).toEqual(1);
        expect(linterMessages[0].file).toEqual('fakeFile.css');
      });
  });

  it('should pass metadata to rules', () => {
    const code = oneLine`/* whatever code */
      #myName { position: relative; }
      .myClass { background: #000; }`;
    const fakeRules = { metadataPassCheck: () => {} };

    // This rule calls assert.fail() if no metadata is passed to it.
    sinon.stub(fakeRules, 'metadataPassCheck').callsFake(metadataPassCheck);

    const scanner = new CSSScanner(code, 'fake.css', {
      addonMetadata: validMetadata({ guid: 'snowflake' }),
    });

    return scanner.scan(fakeRules)
      .then(({ linterMessages }) => {
        sinon.assert.calledTwice(fakeRules.metadataPassCheck);
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should reject if parser throws non-error', () => {
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
    return cssScanner._getContents(fakeCSSParser)
      .then(() => {
        return cssScanner.scan();
      })
      .then(() => {
        expect(false).toBe(true);
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(TypeError);
        expect(err.message).toEqual('Awooga');
      });
  });

  it('should export and run all rules in rules/css', () => {
    const ruleFiles = getRuleFiles('css');
    const code = oneLine`/* whatever code */
      #myName { position: relative; }
      .myClass { background: #000; }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length);

    return cssScanner.scan()
      .then(() => {
        expect(cssScanner._rulesProcessed).toEqual(
          Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

  it('should not blow-up on empty media query', () => {
    const code = '@media only screen and (max-width: 959px) {}';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');
    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  // See: https://github.com/mozilla/addons-linter/issues/693
  it('should not blow-up on `initial` value', () => {
    const code = '.myClass { -moz-binding: url(initial); }';
    const cssScanner = new CSSScanner(code, 'fakeFile.css');
    return cssScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });
});
