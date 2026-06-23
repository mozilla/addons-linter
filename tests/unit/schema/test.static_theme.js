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

  it('should accept additional_backgrounds with a CSS gradient object', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.theme.images = {
      additional_backgrounds: [
        { 'linear-gradient': 'to bottom, #FF6BBA -18.096%, #FFC999 50%' },
      ],
    };
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors).toBeNull();
  });

  it('should accept additional_backgrounds mixing image paths and CSS gradient objects', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.theme.images = {
      additional_backgrounds: [
        'bg1.svg',
        { 'linear-gradient': 'to bottom, #FF6BBA -18.096%, #FFC999 50%' },
        'bg2.png',
      ],
    };
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors).toBeNull();
  });

  it('should fail on additional_backgrounds with an invalid CSS gradient object', () => {
    const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
    manifest.theme.images = {
      additional_backgrounds: [
        { 'invalid-gradient': 'to bottom, #FF6BBA, #FFC999' },
      ],
    };
    validateStaticTheme(manifest);
    expect(validateStaticTheme.errors).not.toBeNull();
    expect(
      validateStaticTheme.errors.some(
        (err) =>
          err.instancePath === '/theme/images/additional_backgrounds/0' &&
          err.message === 'must match a schema in anyOf'
      )
    ).toBe(true);
  });
});
