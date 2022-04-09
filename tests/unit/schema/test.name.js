import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/name', () => {
  it('should be invalid due to name > 45 chars', () => {
    const manifest = cloneDeep(validManifest);
    manifest.name = 'a'.repeat(46);
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('/name');
  });

  it('should be invalid due to name < 2 chars', () => {
    const manifest = cloneDeep(validManifest);
    manifest.name = 'a';
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('/name');
  });

  it('should be invalid due to missing a name', () => {
    const manifest = cloneDeep(validManifest);
    manifest.name = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual('');
    expect(validateAddon.errors[0].params.missingProperty).toEqual('name');
  });
});
