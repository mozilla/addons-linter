import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';
import { VALID_URLS, INVALID_URLS } from './test.homepage_url';

describe('/developer', () => {
  describe('/developer/url', () => {
    it.each(VALID_URLS)('%s should be valid', (validURL) => {
      const manifest = {
        ...cloneDeep(validManifest),
        developer: {
          url: validURL,
        },
      };

      validateAddon(manifest);

      expect(validateAddon.errors).toBeNull();
    });

    it.each(INVALID_URLS)('%s should be invalid', (invalidURL) => {
      const manifest = {
        ...cloneDeep(validManifest),
        developer: {
          url: invalidURL,
        },
      };

      validateAddon(manifest);

      assertHasMatchingError(validateAddon.errors, {
        instancePath: '/developer/url',
        message: /must match format "url"/,
      });
      assertHasMatchingError(validateAddon.errors, {
        message: 'must match pattern "^__MSG_.*?__$"',
      });
    });
  });

  describe('/developer/name', () => {
    it('should be valid if a string', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        developer: {
          name: 'some author',
        },
      };

      validateAddon(manifest);

      expect(validateAddon.errors).toBeNull();
    });

    it('should be invalid if not a string', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        developer: {
          name: {},
        },
      };

      validateAddon(manifest);

      expect(validateAddon.errors.length).toEqual(1);
      expect(validateAddon.errors[0].instancePath).toEqual('/developer/name');
    });
  });
});
