import { BAD_URL_RX } from 'rules/css';
import { singleLineString } from 'utils';


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
});
