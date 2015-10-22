import { LOCAL_CSS_URL, LOCAL_URL } from 'regex';

describe('regex.LOCAL_URL', () => {

  it('should not match remote urls', () => {
    assert.notOk(LOCAL_URL.test('http://foo.com'));
    assert.notOk(LOCAL_URL.test('https://foo.com'));
    assert.notOk(LOCAL_URL.test('ftp://foo.com'));
    assert.notOk(LOCAL_URL.test('//foo.com'));
  });

  it('should not match data uri', () => {
    assert.notOk(LOCAL_URL.test('data:image/gif;base64,R0' +
      'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));
  });

  it('should match chrome protocol', () => {
    assert.ok(LOCAL_URL.test('chrome://bar/foo'));
  });

  it('should match resource protocol', () => {
    assert.ok(LOCAL_URL.test('resource://bar/foo'));
  });

  it('should match non-remote urls starting with /', () => {
    assert.ok(LOCAL_URL.test('/bar/foo'));
  });

});


describe('regex.LOCAL_CSS_URL', () => {
  it('should not match remote urls', () => {
    assert.notOk(LOCAL_CSS_URL.test('url(http://foo.com)'));
    assert.notOk(LOCAL_CSS_URL.test('url(https://foo.com)'));
    assert.notOk(LOCAL_CSS_URL.test('url(ftp://foo.com)'));
    assert.notOk(LOCAL_CSS_URL.test('url(//foo.com)'));
  });

  it('should not match data uri', () => {
    assert.notOk(LOCAL_CSS_URL.test('url(data:image/gif;base64,R0' +
      'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)'));
  });

  it('should not match remote url with quotes and without', () => {
    assert.notOk(LOCAL_CSS_URL.test('url(http://bar/foo)'));
    assert.notOk(LOCAL_CSS_URL.test("url('http://bar/foo')"));
    assert.notOk(LOCAL_CSS_URL.test('url("http://bar/foo")'));
  });

  it('should match chrome protocol', () => {
    assert.ok(LOCAL_CSS_URL.test('url(chrome://bar/foo)'));
  });

  it('should match resource protocol', () => {
    assert.ok(LOCAL_CSS_URL.test('url(resource://bar/foo)'));
  });

  it('should match non-remote urls starting with /', () => {
    assert.ok(LOCAL_CSS_URL.test('url(/bar/foo)'));
  });
});
