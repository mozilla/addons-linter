import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/icons', () => {
  it('should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { 48: 'icon.png', 96: 'bigger.png' };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('should fail on integer value', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { 48: 1 };
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].dataPath).toEqual('/icons/48');
    expect(validateAddon.errors[0].message).toEqual('should be string');
  });

  it('should fail on non-number key', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { wat: 'foo' };
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].dataPath).toEqual('/icons/wat');
    expect(validateAddon.errors[0].message).toEqual(
      'is an invalid additional property',
    );
  });
});
