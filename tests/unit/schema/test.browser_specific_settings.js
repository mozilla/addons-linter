import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/browser_specific_settings/*', () => {
  it('should not require an application object', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });
});

describe('/browser_specific_settings/gecko/*', () => {
  it('should not require a gecko object', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('should be invalid due to invalid update_url', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.update_url = 'whatevs';
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/update_url'
    );
  });

  it('should be invalid because http update_url', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.update_url = 'http://foo.com';
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/update_url'
    );
  });

  it('should be valid because https update_url', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.update_url = 'https://foo.com';
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('should be invalid due to invalid strict_min_version type', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.strict_min_version = 42;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/strict_min_version'
    );
  });

  // For the following tests I copied versions from:
  // https://addons.mozilla.org/en-US/firefox/pages/appversions/
  const validMinVersions = ['1.5.0.4', '3.0a8pre', '22.0a1', '40.0'];
  validMinVersions.forEach((version) => {
    const manifest = cloneDeep(validManifest);
    it(`${version} should be a valid strict_min_version`, () => {
      manifest.browser_specific_settings.gecko.strict_min_version = version;
      expect(validateAddon(manifest)).toBeTruthy();
    });
  });

  const invalidMinVersions = ['48.*', 'wat', '*', '48#1'];
  invalidMinVersions.forEach((version) => {
    it(`${version} should be an invalid strict_min_version`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.browser_specific_settings.gecko.strict_min_version = version;
      validateAddon(manifest);
      expect(validateAddon.errors.length).toEqual(1);
      expect(validateAddon.errors[0].instancePath).toEqual(
        '/browser_specific_settings/gecko/strict_min_version'
      );
    });
  });

  it('should be invalid due to invalid strict_max_version type', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.strict_max_version = 42;
    validateAddon(manifest);
    expect(validateAddon.errors.length).toEqual(1);
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/strict_max_version'
    );
  });

  const validMaxVersions = validMinVersions.slice();
  validMaxVersions.push('48.*');
  validMaxVersions.forEach((version) => {
    it(`${version} should be a valid strict_max_version`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.browser_specific_settings.gecko.strict_max_version = version;
      expect(validateAddon(manifest)).toBeTruthy();
    });
  });

  it('should be invalid due to invalid strict_max_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.strict_max_version = 'fifty';
    expect(validateAddon(manifest)).toBeFalsy();
  });

  it('should be a valid id (email-like format)', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id = 'extensionname@example.org';
    expect(validateAddon(manifest)).toBeTruthy();
  });

  it('should be a valid id @whatever', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id = '@example.org';
    expect(validateAddon(manifest)).toBeTruthy();
  });

  it('should be a valid id (guid format)', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id =
      '{daf44bf7-a45e-4450-979c-91cf07434c3d}';
    expect(validateAddon(manifest)).toBeTruthy();
  });

  it('should be invalid for a number', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id = 10;
    validateAddon(manifest);
    expect(validateAddon.errors.length >= 1).toBeTruthy();
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/id'
    );
  });

  it('should be invalid id format', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id = 'whatevs';
    validateAddon(manifest);
    expect(validateAddon.errors.length >= 1).toBeTruthy();
    expect(validateAddon.errors[0].instancePath).toEqual(
      '/browser_specific_settings/gecko/id'
    );
  });

  it('should accept an add-on without an id', () => {
    const manifest = cloneDeep(validManifest);
    manifest.browser_specific_settings.gecko.id = undefined;
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });
});
