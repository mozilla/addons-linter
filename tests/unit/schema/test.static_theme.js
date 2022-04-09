import cloneDeep from 'lodash.clonedeep';

import { validateStaticTheme } from 'schema/validator';

import { validStaticThemeManifestJSON } from '../helpers';

describe('static theme', () => {
  it('should be valid', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors).toBeNull();
  });

  it('should fail on missing manifest_version', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.manifest_version = null;
    validateStaticTheme(manifest);

    expect(validateStaticTheme.errors.length).toEqual(1);
    expect(validateStaticTheme.errors[0].instancePath).toEqual(
      '/manifest_version'
    );
    expect(validateStaticTheme.errors[0].message).toEqual('must be integer');
  });

  it('should fail on missing theme property', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.theme = null;
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors.length).toEqual(1);
    expect(validateStaticTheme.errors[0].instancePath).toEqual('/theme');
    expect(validateStaticTheme.errors[0].message).toEqual('must be object');
  });

  it('should fail on invalid additional properties', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.content_scripts = ['foo.js'];
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors.length).toEqual(1);
    expect(validateStaticTheme.errors[0].instancePath).toEqual('');
    expect(validateStaticTheme.errors[0].message).toEqual(
      'must NOT have additional properties'
    );
  });
});
