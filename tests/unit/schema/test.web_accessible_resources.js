import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/web_accessible_resources', () => {
  it('should be an array', () => {
    const manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = 'foo.png';
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].dataPath).toEqual(
      '/web_accessible_resources'
    );
    expect(validateAddon.errors[0].message).toEqual('should be array');
  });

  it('should fail if not an array of strings', () => {
    const manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 1];
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].dataPath).toEqual(
      '/web_accessible_resources/1'
    );
    expect(validateAddon.errors[0].message).toEqual('should be string');
  });

  it('should be array of strings', () => {
    const manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 'bar.css'];
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });
});
