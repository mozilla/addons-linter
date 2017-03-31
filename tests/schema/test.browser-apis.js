import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import {
  hasBrowserApi,
  isDeprecatedApi,
  isTemporaryApi,
} from 'schema/browser-apis';

describe('browserApis', () => {
  describe('hasBrowserApi', () => {
    it('is false when the API is unknown', () => {
      assert.notOk(hasBrowserApi('foo', 'notAnApi'));
    });

    it('is true when it supports an API', () => {
      assert.ok(hasBrowserApi('cookies', 'get'));
    });

    it('has the API when it is temporary', () => {
      const [namespace, property] = TEMPORARY_APIS[0].split('.');
      assert.ok(hasBrowserApi(namespace, property));
    });

    it('has the API when it is deprecated', () => {
      const [namespace, property] = DEPRECATED_APIS[0].split('.');
      assert.ok(hasBrowserApi(namespace, property));
    });
  });

  describe('isDeprecatedApi', () => {
    it('is not deprecated if it is unknown', () => {
      assert.notOk(isDeprecatedApi('foo', 'notAnApi'));
    });

    it('is deprecated if it is in DEPRECATED_APIS', () => {
      assert.include(DEPRECATED_APIS, 'app.getDetails');
      assert.ok(isDeprecatedApi('app', 'getDetails'));
    });
  });

  describe('isTemporaryApi', () => {
    it('is not temporary if it is unknown', () => {
      assert.notOk(isTemporaryApi('foo', 'notAnApi'));
    });

    it('is temporary if it is in TEMPORARY_APIS', () => {
      assert.include(TEMPORARY_APIS, 'identity.getRedirectURL');
      assert.ok(isTemporaryApi('identity', 'getRedirectURL'));
    });
  });
});
