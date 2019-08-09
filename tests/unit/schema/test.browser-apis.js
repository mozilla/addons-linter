import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import { hasBrowserApi, isTemporaryApi } from 'schema/browser-apis';

describe('browserApis', () => {
  describe('hasBrowserApi', () => {
    it('is false when the API is unknown', () => {
      expect(hasBrowserApi('foo', 'notAnApi')).toBeFalsy();
    });

    it('is true when it supports an API', () => {
      expect(hasBrowserApi('cookies', 'get')).toBeTruthy();
    });

    it('has the API when it is temporary', () => {
      const [namespace, property] = TEMPORARY_APIS[0].split('.');
      expect(hasBrowserApi(namespace, property)).toBeTruthy();
    });

    it('has the API when it is deprecated', () => {
      const [namespace, property] = DEPRECATED_APIS[0].split('.');
      expect(hasBrowserApi(namespace, property)).toBeTruthy();
    });
  });

  describe('isTemporaryApi', () => {
    it('is not temporary if it is unknown', () => {
      expect(isTemporaryApi('foo', 'notAnApi')).toBeFalsy();
    });

    it('is temporary if it is in TEMPORARY_APIS', () => {
      expect(TEMPORARY_APIS).toContain('identity.getRedirectURL');
      expect(isTemporaryApi('identity', 'getRedirectURL')).toBeTruthy();
    });
  });
});
