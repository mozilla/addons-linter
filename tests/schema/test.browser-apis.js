import { hasBrowserApi } from 'schema/browser-apis';

describe('browserApis', () => {
  describe('hasBrowserApi', () => {
    it('is false when the API is unknown', () => {
      assert.notOk(hasBrowserApi('foo', 'notAnApi'));
    });

    it('is true when it supports an API', () => {
      assert.ok(hasBrowserApi('cookies', 'get'));
    });
  });
});
