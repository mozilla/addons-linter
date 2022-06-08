import cloneDeep from 'lodash.clonedeep';

import { SCHEMA_KEYWORDS } from 'const';
import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('experiments', () => {
  describe('/experiment_apis', () => {
    it('should emit an error when experiment_apis does not have any properties', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        experiment_apis: {},
      };

      validateAddon(manifest);

      expect(validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/experiment_apis',
            keyword: SCHEMA_KEYWORDS.MIN_PROPERTIES,
          }),
        ])
      );
    });
  });
});
