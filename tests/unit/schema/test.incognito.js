import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/incognito', () => {
  it('"spanning" should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.incognito = 'spanning';
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('not "spanning" should be invalid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.incognito = 'wat';
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/incognito',
      message: 'must be equal to one of the allowed values',
    });
  });
});
