import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/manifest_version', () => {
  it('should be invalid due to old manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 1;
    validateAddon(manifest);
    expect(validateAddon.errors[0].dataPath).toEqual('/manifest_version');
    expect(validateAddon.errors.length).toEqual(1);
  });

  it('should be invalid due to missing manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].dataPath).toEqual('/manifest_version');
    expect(validateAddon.errors[0].params.missingProperty).toEqual(
      'manifest_version'
    );
  });
});
