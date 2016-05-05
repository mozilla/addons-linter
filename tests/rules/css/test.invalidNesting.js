import * as messages from 'messages';

import { VALIDATION_WARNING } from 'const';
import { singleLineString } from 'utils';

import CSSScanner from 'scanners/css';


describe('CSS Rule InvalidNesting', () => {

  it('should detect invalid nesting', () => {
    var code = singleLineString`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.INVALID_SELECTOR_NESTING.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should not detect invalid nesting', () => {
    var code = singleLineString`/* I'm a comment */
      @media only screen and (max-width: 959px) {
          .something-else {
              height: 100px;
          }
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should detect invalid nesting in @media block', () => {
    var code = singleLineString`/* I'm a comment */
      @media only screen and (max-width: 959px) {
        .foo {
          .something-else {
              height: 100px;
          }
        }
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.INVALID_SELECTOR_NESTING.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
