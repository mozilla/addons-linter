import * as messages from 'messages';

import { VALIDATION_ERROR } from 'const';
import { singleLineString } from 'utils';

import CSSScanner from 'validators/css';


describe('CSS Rule detectBadMozBinding', () => {

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

});
