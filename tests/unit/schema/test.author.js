import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/author', () => {
  it('should be valid if a string', () => {
    const manifest = cloneDeep(validManifest);
    manifest.author = 'some string';
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('should be invalid if not a string', () => {
    const manifest = cloneDeep(validManifest);
    manifest.author = {};
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('/author');
  });
});
