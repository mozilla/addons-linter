import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/manifest_version', () => {
  it('should be invalid due to old manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 1;
    validateAddon(manifest);
    expect(validateAddon.errors[0].instancePath).toEqual('/manifest_version');
    expect(validateAddon.errors.length).toEqual(1);
  });

  it('should be valid on manifest_version 2', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 2;
    validateAddon(manifest);
    expect(validateAddon.errors).toEqual(null);
  });

  it('should be valid on manifest_version 3', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 3;
    validateAddon(manifest);
    expect(validateAddon.errors).toEqual(null);
  });

  it('should be invalid due to unsupported new manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 4;
    validateAddon(manifest);
    expect(validateAddon.errors[0].instancePath).toEqual('/manifest_version');
    expect(validateAddon.errors[0].message).toEqual('must be <= 3');
    expect(validateAddon.errors.length).toEqual(1);
  });

  it('should be invalid due to missing manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('');
    expect(validateAddon.errors[0].params.missingProperty).toEqual(
      'manifest_version'
    );
  });
});
