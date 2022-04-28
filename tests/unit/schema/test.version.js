import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/version', () => {
  it('should be invalid due to invalid version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = '01';
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('/version');
  });

  it('should be invalid due to missing version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('');
    expect(validateAddon.errors[0].params.missingProperty).toEqual('version');
  });

  it('should be valid if it is a toolkit version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = '1.0.0.0pre0';
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });
});
