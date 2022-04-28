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

  // NOTE: this is enforced by overriding manifest_version API schema data
  // with `"maximum": 2` from src/schema/updates/manifest.json.
  it('should be invalid on manifest_version 3', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 3;
    validateAddon(manifest);
    expect(validateAddon.errors[0].instancePath).toEqual('/manifest_version');
    expect(validateAddon.errors[0].message).toEqual('must be <= 2');
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
