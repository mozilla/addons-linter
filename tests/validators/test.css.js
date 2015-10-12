import * as messages from 'messages';
import { VALIDATION_ERROR } from 'const';
import CSSScanner from 'validators/css';
import { singleLineString } from 'utils';



describe('CSS', () => {

  it('should detect -moz-binding used with remote urls', () => {
    var code = singleLineString`/* I'm a comment */
      #something {
        -moz-binding:url("http://foo.bar/remote/sites/are/bad");
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.MOZ_BINDING_EXT_REFERENCE.code);
        assert.equal(validationMessages[0].type, VALIDATION_ERROR);
      });
  });

  it('should detect -moz-binding used with protocol-free urls', () => {
    var code = singleLineString`/* I'm a comment */
      #something {
        -moz-binding:url("//foo.bar/remote/sites/are/bad");
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].code,
                     messages.MOZ_BINDING_EXT_REFERENCE.code);
      });
  });

  it('should not detect -moz-binding used with chrome:/resource: urls', () => {
    var code = singleLineString`/* I'm a comment */
      .something-else {
        -moz-binding:url("resource://foo.bar/remote/sites/are/bad");
      }
      .something {
        -moz-binding:url("chrome://foo.bar/remote/sites/are/bad");
      }`;
    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

  it('should not detect standard paths as a problem', () => {
    var code = singleLineString`/* I'm a comment */
      .something-else {
        -moz-binding:url("/foo.bar/remote/sites/are/bad");
      }`;

    var cssScanner = new CSSScanner(code, 'fakeFile.css');
    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 0);
      });
  });

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

    return cssScanner.scan(fakeCSSParser)
      .then(() => {
        assert.fail(null, null, 'unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, 'Awooga');
      });

  });

});
