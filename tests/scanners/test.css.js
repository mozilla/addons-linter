import * as messages from 'messages';
import { VALIDATION_ERROR } from 'const';
import CSSScanner from 'scanners/css';
import * as rules from 'rules/css';
import { getRuleFiles } from '../helpers';
import { ignorePrivateFunctions, singleLineString } from 'utils';


describe('CSSScanner', () => {

  it('should add CSS_SYNTAX_ERROR with invalid css', () => {
    var code = '#something {';
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.CSS_SYNTAX_ERROR.code);
        assert.equal(validationMessages[0].type, VALIDATION_ERROR);
        assert.include(validationMessages[0].message, 'missing');
        assert.equal(validationMessages[0].line, 1);
        assert.equal(validationMessages[0].column, 13);
        assert.equal(validationMessages[0].file, 'fakeFile.css');
      });
  });

  it('should reject if parser throws non-error', () => {
    var code = '/* whatever code */';
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    var fakeCSSParser = {
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
        assert.fail(null, null, 'unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, 'Awooga');
      });
  });

  it('should export and run all rules in rules/css', () => {
    var ruleFiles = getRuleFiles('css');
    var code = singleLineString`/* whatever code */
      #myName { position: relative; }
      .myClass { background: #000; }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    assert.equal(ruleFiles.length,
                 Object.keys(ignorePrivateFunctions(rules)).length);

    return cssScanner.scan()
      .then(() => {
        assert.equal(cssScanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });
});
