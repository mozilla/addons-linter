import { DEPRECATED_JAVASCRIPT_APIS, TEMPORARY_APIS } from 'const';
import {
  getManifestVersion,
  getMaxManifestVersion,
  getMinManifestVersion,
  hasBrowserApi,
  isDeprecatedApi,
  isMV2RemovedApi,
  isTemporaryApi,
} from 'schema/browser-apis';

const fakeNs = 'fakeAPINamespace';
const fakeProp = 'fakeMethod';
const fakeMetadata = { manifestVersion: 2 };
const fakeMetadataV3 = { manifestVersion: 3 };

describe('browserApis', () => {
  describe('hasBrowserApi', () => {
    it('is false when the API is unknown', () => {
      expect(hasBrowserApi('foo', 'notAnApi')).toBeFalsy();
    });

    it('is true when it supports an API', () => {
      expect(hasBrowserApi('cookies', 'get')).toEqual(true);
      // Make sure that is still the case with specific manifestVersion values.
      expect(hasBrowserApi('cookies', 'get', { manifestVersion: 2 })).toEqual(
        true
      );
      expect(hasBrowserApi('cookies', 'get', { manifestVersion: 3 })).toEqual(
        true
      );
    });

    it('has the API when it is temporary', () => {
      const [namespace, property] = TEMPORARY_APIS[0].split('.');
      expect(hasBrowserApi(namespace, property)).toBeTruthy();
    });

    it('has the API when it is deprecated', () => {
      const [namespace, property] = Object.keys(
        DEPRECATED_JAVASCRIPT_APIS
      )[0].split('.');
      expect(hasBrowserApi(namespace, property)).toBeTruthy();
    });

    it('does not have the API when unsupported for the given manifest_version', () => {
      // Unsupported namespace in mv2.
      let fakeSchemas = {
        [fakeNs]: {
          min_manifest_version: 3,
          functions: [{ name: fakeProp }],
        },
      };

      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
      ).toEqual(false);
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadataV3, fakeSchemas)
      ).toEqual(true);

      // Unsupported api method in mv2.
      fakeSchemas = {
        [fakeNs]: {
          functions: [{ name: fakeProp, min_manifest_version: 3 }],
        },
      };
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
      ).toEqual(false);
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadataV3, fakeSchemas)
      ).toEqual(true);

      // Unsupported namespace in mv3.
      fakeSchemas = {
        [fakeNs]: {
          max_manifest_version: 2,
          functions: [{ name: fakeProp }],
        },
      };
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadataV3, fakeSchemas)
      ).toEqual(false);
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
      ).toEqual(true);

      // Unsupported api method in mv3.
      fakeSchemas = {
        [fakeNs]: {
          functions: [{ name: fakeProp, max_manifest_version: 2 }],
        },
      };
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadataV3, fakeSchemas)
      ).toEqual(false);
      expect(
        hasBrowserApi(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
      ).toEqual(true);
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

  describe('isDeprecatedApi', () => {
    it('is always false when the API is removed in manifest_version 3', () => {
      // Unsupported method in mv3.
      const fakeSchemas = {
        runtime: {
          functions: [
            {
              name: 'getBackgroundPage',
              max_manifest_version: 2,
            },
          ],
        },
      };

      expect(
        isDeprecatedApi(
          'runtime',
          'getBackgroundPage',
          { manifestVersion: 3 },
          fakeSchemas
        )
      ).toEqual(false);

      expect(
        isDeprecatedApi(
          'runtime',
          'getBackgroundPage',
          { manifestVersion: 2 },
          fakeSchemas
        )
      ).toEqual(false);
    });
  });

  describe('isMV2RemovedApi', () => {
    it('is true for API removed in manifest_version 3', () => {
      // Unsupported method in mv3.
      const fakeSchemas = {
        runtime: {
          functions: [
            {
              name: 'getBackgroundPage',
              max_manifest_version: 2,
            },
          ],
        },
      };

      expect(
        isMV2RemovedApi(
          'runtime',
          'getBackgroundPage',
          { manifestVersion: 3 },
          fakeSchemas
        )
      ).toEqual(true);

      expect(
        isMV2RemovedApi(
          'runtime',
          'getBackgroundPage',
          { manifestVersion: 2 },
          fakeSchemas
        )
      ).toEqual(false);
    });
  });

  describe('getManifestVersion', () => {
    it('returns the manifestVersion given the addonMetadata', () => {
      expect(getManifestVersion({ manifestVersion: 3 })).toBe(3);
    });
    it('returns default manifest version on undefined addonMetadata', () => {
      expect(getManifestVersion()).toBe(2);
      expect(getManifestVersion({})).toBe(undefined);
    });
  });

  describe('getMaxManifestVersion', () => {
    describe('returns the lower value set on namespace and prop value', () => {
      const testCases = [
        {
          fakeSchemas: {
            [fakeNs]: {
              max_manifest_version: 2,
              functions: [{ name: fakeProp }],
            },
          },
          expected: 2,
        },
        {
          fakeSchemas: {
            [fakeNs]: {
              functions: [{ name: fakeProp, max_manifest_version: 2 }],
            },
          },
          expected: 2,
        },
        {
          fakeSchemas: {
            [fakeNs]: {
              max_manifest_version: 3,
              functions: [{ name: fakeProp, max_manifest_version: 2 }],
            },
          },
          expected: 2,
        },
        {
          // It shouldn't happen in practice, because we shouldn't mark
          // the namespace manifest_version compatibility to a value lower
          // than the properties part of that namespace.
          fakeSchemas: {
            [fakeNs]: {
              max_manifest_version: 2,
              functions: [{ name: fakeProp, max_manifest_version: 3 }],
            },
          },
          expected: 2,
        },
      ];

      for (const { fakeSchemas, expected } of testCases) {
        it(`returns ${expected} on schema: ${JSON.stringify(
          fakeSchemas
        )}`, () =>
          expect(
            getMaxManifestVersion(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
          ).toBe(expected));
      }
    });
  });

  describe('getMinManifestVersion', () => {
    describe('returns the higher value set on namespace and prop value', () => {
      const testCases = [
        {
          fakeSchemas: {
            [fakeNs]: {
              min_manifest_version: 3,
              functions: [{ name: fakeProp }],
            },
          },
          expected: 3,
        },
        {
          fakeSchemas: {
            [fakeNs]: {
              functions: [{ name: fakeProp, min_manifest_version: 3 }],
            },
          },
          expected: 3,
        },
        {
          fakeSchemas: {
            [fakeNs]: {
              min_manifest_version: 2,
              functions: [{ name: fakeProp, min_manifest_version: 3 }],
            },
          },
          expected: 3,
        },
        {
          // It shouldn't happen in practice, because we shouldn't mark
          // the namespace manifest_version compatibility to a value higher
          // than the properties part of that namespace.
          fakeSchemas: {
            [fakeNs]: {
              min_manifest_version: 3,
              functions: [{ name: fakeProp, min_manifest_version: 2 }],
            },
          },
          expected: 3,
        },
      ];

      for (const { fakeSchemas, expected } of testCases) {
        it(`returns ${expected} on schema: ${JSON.stringify(
          fakeSchemas
        )}`, () =>
          expect(
            getMinManifestVersion(fakeNs, fakeProp, fakeMetadata, fakeSchemas)
          ).toBe(expected));
      }
    });
  });
});
