import * as messages from 'messages';

import { BAD_URL_RX } from 'rules/css';
import { VALIDATION_ERROR } from 'const';
import { singleLineString } from 'utils';

import CSSScanner from 'validators/css';


describe('BAD_URL_RX', () => {

  it('should match remote urls', () => {
    assert.ok(BAD_URL_RX.test('url(http://foo.com)'));
    assert.ok(BAD_URL_RX.test('url(https://foo.com)'));
    assert.ok(BAD_URL_RX.test('url(ftp://foo.com)'));
    assert.ok(BAD_URL_RX.test('url(//foo.com)'));
  });

  it('should match data uri', () => {
    assert.ok(BAD_URL_RX.test(singleLineString`url(data:image/gif;
      base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)`));
  });

  it('should not match chrome protocol', () => {
    assert.notOk(BAD_URL_RX.test('url(chrome://bar/foo)'));
  });

  it('should not match resource protocol', () => {
    assert.notOk(BAD_URL_RX.test('url(resource://bar/foo)'));
  });

  it('should match remote url with quotes and without', () => {
    assert.ok(BAD_URL_RX.test('url(http://bar/foo)'));
    assert.ok(BAD_URL_RX.test("url('http://bar/foo')"));
    assert.ok(BAD_URL_RX.test('url("http://bar/foo")'));
  });

  it('should not match non-remote urls starting with /', () => {
    assert.notOk(BAD_URL_RX.test('url(/bar/foo)'));
  });

});


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
