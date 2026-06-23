import cloneDeep from 'lodash.clonedeep';

import { validateStaticTheme } from 'schema/validator';
import { SUPPORTED_CSS_GRADIENT_FUNCTIONS } from 'parsers/manifestjson';

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

  describe('CSS gradient parameter validation', () => {
    it.each([
      ['linear-gradient', 'to bottom, #FF6BBA -18.096%, #FFC999 50%'],
      ['linear-gradient', '90deg, #9059FF 0%, #FF4AA2 52.08%, #FFBD4F 100%'],
      ['radial-gradient', 'circle, red, blue'],
      ['conic-gradient', 'from 90deg, red, blue'],
      ['repeating-linear-gradient', 'red 0%, blue 20%, red 40%'],
      ['repeating-radial-gradient', 'circle, red 0%, blue 50%'],
      ['repeating-conic-gradient', 'from 45deg, red, blue'],
    ])('should accept valid %s parameters', (gradientFn, params) => {
      const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
      manifest.theme.images = {
        additional_backgrounds: [{ [gradientFn]: params }],
      };
      validateStaticTheme(manifest);
      expect(validateStaticTheme.errors).toBeNull();
    });

    it.each([
      ['linear-gradient', 'red), url(chrome://path/to/image.png), linear-gradient(transparent,'],
      ['linear-gradient', '<script>alert(1)</script>'],
    ])(
      'should fail on %s with invalid CSS parameters',
      (gradientFn, params) => {
        const manifest = cloneDeep(JSON.parse(validStaticThemeManifestJSON()));
        manifest.theme.images = {
          additional_backgrounds: [{ [gradientFn]: params }],
        };
        validateStaticTheme(manifest);
        expect(validateStaticTheme.errors).not.toBeNull();
        expect(
          validateStaticTheme.errors.some(
            (err) => err.keyword === 'validCSSGradient'
          )
        ).toBe(true);
      }
    );

    it('SUPPORTED_CSS_GRADIENT_FUNCTIONS matches the ThemeCSSGradient schema', () => {
      expect([...SUPPORTED_CSS_GRADIENT_FUNCTIONS]).toEqual([
        'linear-gradient',
        'radial-gradient',
        'conic-gradient',
        'repeating-linear-gradient',
        'repeating-radial-gradient',
        'repeating-conic-gradient',
      ]);
    });
  });
});
