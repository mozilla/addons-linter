import fs from 'fs';

import { oneLine } from 'common-tags';

import Linter from 'linter';
import ManifestJSONParser from 'parsers/manifestjson';
import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import * as messages from 'messages';

import {
  assertHasMatchingError,
  validManifestJSON,
  validDictionaryManifestJSON,
  validLangpackManifestJSON,
  validStaticThemeManifestJSON,
  getStreamableIO,
  EMPTY_PNG,
  EMPTY_APNG,
  EMPTY_GIF,
  EMPTY_JPG,
  EMPTY_SVG,
  EMPTY_TIFF,
  EMPTY_WEBP,
} from '../helpers';

describe('ManifestJSONParser', () => {
  it('should have empty metadata if bad JSON', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const manifestJSONParser = new ManifestJSONParser(
      'blah',
      addonLinter.collector
    );
    expect(manifestJSONParser.isValid).toEqual(false);
    const { errors } = addonLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');

    const metadata = manifestJSONParser.getMetadata();
    expect(metadata.manifestVersion).toEqual(null);
    expect(metadata.name).toEqual(null);
    expect(metadata.version).toEqual(null);
  });

  it('should see browser_specific_settings as alias of applications', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      applications: undefined,
      browser_specific_settings: {
        gecko: {
          id: 'foo@baa',
          update_url: '',
        },
      },
    });
    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );
    const metadata = manifestJSONParser.getMetadata();
    expect(metadata.id).toEqual('foo@baa');

    // Verify that any lint error added from the schema
    // validation is not produced twice.
    expect(manifestJSONParser.isValid).toEqual(false);
    expect(addonLinter.collector.errors.length).toEqual(1);
    assertHasMatchingError(addonLinter.collector.errors, {
      code: messages.JSON_INVALID.code,
      message: /update_url" should match format "secureUrl"/,
      dataPath: '/browser_specific_settings/gecko/update_url',
    });
  });

  describe('id', () => {
    it('should return the correct id', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual('{daf44bf7-a45e-4450-979c-91cf07434c3d}');
    });

    it('should fail on invalid id', () => {
      // This is probably covered in other tests, but verifies that if the
      // id is something incorrect, you shouldn't even be calling getMetadata.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: { gecko: { id: 'wat' } },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/applications\/gecko\/id" should match pattern/,
      });
    });

    it('should fail on id longer than 255 characters', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: { gecko: { id: '@' + 'a'.repeat(255) } },  // 256 chars.
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/applications\/gecko\/id" should NOT be longer than 255 characters/,
      });
    });

    it('should return null if undefined', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ applications: {} });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual(null);
    });
  });

  describe('manifestVersion', () => {
    it('should collect an error on invalid manifest_version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: 'whatever' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should collect an error with numeric string value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: '1' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should have the right manifestVersion', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.manifestVersion).toEqual(VALID_MANIFEST_VERSION);
    });
  });

  describe('bad permissions', () => {
    it('should not error if permission is a string (even if unknown)', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: ['identity', 'fileSystem'],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { warnings } = addonLinter.collector;
      expect(addonLinter.collector.errors.length).toBe(0);
      assertHasMatchingError(warnings, {
        code: messages.MANIFEST_PERMISSIONS.code,
        message: /Unknown permissions "fileSystem"/,
      });
    });

    it('should error if permission is not a string', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: [
          'identity',
          {
            fileSystem: ['write'],
          },
        ],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should be string');
    });

    it('should error if permission is duplicated', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: ['identity', 'identity'],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should NOT have duplicate items');
    });
  });

  describe('type', () => {
    it('should have the right type', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });

    it('should not allow the type to be user-specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ type: 'whatevs' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });
  });

  describe('ManfiestJSONParser lookup', () => {
    const unknownDataPaths = ['', '/permissions/foo', '/permissions/'];
    unknownDataPaths.forEach((unknownData) => {
      it(`should return invalid for ${unknownData}`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const parser = new ManifestJSONParser(
          validManifestJSON(),
          addonLinter.collector
        );
        const message = parser.errorLookup({ dataPath: '' });
        expect(message.code).toEqual(messages.JSON_INVALID.code);
      });
    });

    it('should return required for missing', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({ dataPath: '', keyword: 'required' });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
    });

    it('should return invalid for wrong type', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({ dataPath: '', keyword: 'type' });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
    });

    it('should return permission for wrong type', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({ dataPath: '/permissions/0' });
      expect(message.code).toEqual(messages.MANIFEST_PERMISSIONS.code);
    });
  });

  describe('enum', () => {
    it('should only return one message', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ permissions: ['alarms', 'wat'] });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(1);
      expect(warnings[0].code).toEqual(messages.MANIFEST_PERMISSIONS.code);
      expect(warnings[0].message).toContain(
        '/permissions: Unknown permissions "wat" at 1.'
      );
    });
  });

  describe('name', () => {
    it('should extract a name', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: 'my-awesome-ext' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.name).toEqual('my-awesome-ext');
    });

    it('should collect an error on missing name value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: undefined });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/name');
    });

    it('should collect an error on non-string name value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: 1 });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/name');
    });
  });

  describe('version', () => {
    it('should extract a version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: '1.0' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.version).toEqual('1.0');
    });

    it('should collect an error on missing version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: undefined });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect an error on non-string version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: 1 });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect a notice on toolkit version values', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: '1.0.0.0pre0' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { notices } = addonLinter.collector;
      expect(notices[0].code).toEqual(messages.PROP_VERSION_TOOLKIT_ONLY.code);
      expect(notices[0].message).toContain('version');
    });
  });

  describe('strict_max_version', () => {
    it('warns on strict_max_version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_max_version: '58.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { notices } = addonLinter.collector;
      expect(notices[0].code).toEqual(messages.STRICT_MAX_VERSION.code);
      expect(notices[0].message).toContain('strict_max_version');
    });

    it('does not warn on strict_max_version in language packs', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({
        applications: {
          gecko: {
            strict_max_version: '58.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.notices.length).toEqual(0);
    });

    it('errors on strict_max_version in dictionaries', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        applications: {
          gecko: {
            id: '@my-dictionary',
            strict_max_version: '58.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.STRICT_MAX_VERSION.code);
      expect(errors[0].message).toContain('strict_max_version');
    });
  });

  describe('strict_min_version', () => {
    it('should warn when using a manifest key before Firefox marks it as supported', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(6);
      let fxIncompatCount = 0;
      for (const warning of addonLinter.collector.warnings) {
        if (
          warning.code !==
          messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
        ) {
          expect(warning.code).toEqual(
            messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
          );
          ++fxIncompatCount;
        }
      }
      expect(fxIncompatCount).toBeGreaterThan(0);
    });

    it('should warn when using a manifest key before Firefox for Android marks it as supported', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(6);
      let fxaIncompatCount = 0;
      for (const warning of addonLinter.collector.warnings) {
        if (warning.code !== messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION) {
          expect(warning.code).toEqual(
            messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
          );
          ++fxaIncompatCount;
        }
      }
      expect(fxaIncompatCount).toBeGreaterThan(0);
    });

    it('should not warn when using an unsupported manifest key without strict_min_version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should not warn when all manifest keys are supported in Firefox and Firefox for Android with the given strict_min_version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '48.0a1',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should ignore manifest key version support for dictionaries', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        applications: {
          gecko: {
            id: '@my-dictionary',
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } },
        }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should ignore manifest key version support for langpacks', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should warn on unsupported subkeys', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '54.0',
          },
        },
        chrome_settings_overrides: {
          homepage: 'https://example.com',
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(2);
      for (const warning of warnings) {
        expect(warning.code).toEqual(
          messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
        );
      }
    });

    it('should warn on unsupported subsubkeys', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '56.0',
          },
        },
        chrome_settings_overrides: {
          search_provider: {
            name: 'test',
            search_url: 'https://example.com',
            is_default: true,
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(1);
      expect(warnings[0].code).toEqual(
        messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
      );
    });

    it('should add a notice on unsupported permissions', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '56.0',
          },
        },
        optional_permissions: ['find'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
      expect(addonLinter.collector.notices.length).toEqual(1);
      expect(addonLinter.collector.notices[0].code).toEqual(
        messages.PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
      );
    });
    it('should add a notice on unsupported permissions on android', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            strict_min_version: '55.0',
          },
        },
        permissions: ['browsingData'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
      expect(addonLinter.collector.notices.length).toEqual(1);
      expect(addonLinter.collector.notices[0].code).toEqual(
        messages.PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
      );
    });
  });

  describe('content security policy', () => {
    it('should warn on rules allowing remote code execution', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_security_policy: 'foo',
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should warn on invalid values according to Add-On Policies', () => {
      const invalidValues = [
        'default-src *',
        'default-src moz-extension: *', // mixed with * invalid
        'default-src ws:',
        'default-src wss:',
        'default-src http:',
        'default-src https:',
        'default-src ftp:',
        'default-src http://cdn.example.com/my.js',
        'default-src https://cdn.example.com/my.js',
        'default-src web.example.com',
        'default-src web.example.com:80',
        'default-src web.example.com:443',

        'script-src *',
        'script-src moz-extension: *', // mixed with * invalid
        'script-src ws:',
        'script-src wss:',
        'script-src http:',
        'script-src https:',
        'script-src ftp:',
        'script-src http://cdn.example.com/my.js',
        'script-src https://cdn.example.com/my.js',
        'script-src web.example.com',
        'script-src web.example.com:80',
        'script-src web.example.com:443',

        'worker-src *',
        'worker-src moz-extension: *', // mixed with * invalid
        'worker-src ws:',
        'worker-src wss:',
        'worker-src http:',
        'worker-src https:',
        'worker-src ftp:',
        'worker-src http://cdn.example.com/my.js',
        'worker-src https://cdn.example.com/my.js',
        'worker-src web.example.com',
        'worker-src web.example.com:80',
        'worker-src web.example.com:443',

        // Properly match mixed with other directives
        "script-src https: 'unsafe-inline'; object-src 'self'",
        "default-src http:; worker-src: 'self'",
      ];

      invalidValues.forEach((invalidValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const json = validManifestJSON({
          content_security_policy: invalidValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        const { warnings } = addonLinter.collector;
        expect(warnings[0].code).toEqual(messages.MANIFEST_CSP.code);
        expect(warnings[0].message).toContain('content_security_policy');
      });
    });

    it('should not warn on valid values according to Add-On Policies', () => {
      const validValues = [
        'default-src moz-extension:',
        'script-src moz-extension:',

        // Mix with other directives
        "script-src 'self'; object-src 'self'",
        "script-src 'none'; object-src 'self'",

        // We only walk through default-src and script-src
        'style-src http://by.cdn.com/',

        // unsafe-inline is not supported by Firefox and won't be for the
        // forseeable future. See http://bit.ly/2wG6LP0 for more details-
        "script-src 'self' 'unsafe-inline';",

        // 'default-src' is insecure, but the limiting 'script-src' prevents
        // remote script injection
        "default-src *; script-src 'self'",
        "default-src https:; script-src 'self'",
        "default-src example.com; script-src 'self'",
        "default-src http://remote.com/; script-src 'self'",
      ];

      validValues.forEach((validValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const json = validManifestJSON({
          content_security_policy: validValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        expect(addonLinter.collector.warnings.length).toEqual(0);
      });
    });

    it('Should issue a detailed warning for unsafe-eval', () => {
      const invalidValue = "script-src 'self' 'unsafe-eval';";
      const addonLinter = new Linter({ _: ['bar'] });

      const json = validManifestJSON({
        content_security_policy: invalidValue,
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings[0].code).toEqual(messages.MANIFEST_CSP_UNSAFE_EVAL.code);
      expect(warnings[0].message).toEqual(
        "Using 'eval' has strong security and performance implications."
      );
    });
  });

  describe('update_url', () => {
    // Chrome Web Extensions put their `update_url` in the root of their
    // manifest, which Firefox ignores. We should notify the user it will
    // be ignored, but that's all.
    it('is allowed but should notify in the manifest', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ update_url: 'https://foo.com/bar' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: false }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { notices } = addonLinter.collector;
      expect(notices[0].code).toEqual(messages.MANIFEST_UNUSED_UPDATE.code);
      expect(notices[0].message).toContain('update_url');
    });

    // applications.gecko.update_url isn't allowed if the add-on is being
    // hosted on AMO.
    it('is not allowed', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: false }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_UPDATE_URL.code);
      expect(errors[0].message).toContain('update_url');
    });

    it('is not an issue if self-hosted', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        applications: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: true }
      );
      manifestJSONParser.selfHosted = true;
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toBe(0);
    });
  });

  describe('schema error overrides', () => {
    // https://github.com/mozilla/addons-linter/issues/732
    it('uses a modified error message', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      // 'scripts' intentionally misspelled as 'script'.
      const json = validManifestJSON({
        background: { script: ['background.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      assertHasMatchingError(errors, {
        code: messages.JSON_INVALID.code,
        message:
          '"/background" is not a valid key or has invalid ' +
          'extra properties',
      });
    });
  });

  describe('default_locale', () => {
    it('error if missing messages.json', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.NO_MESSAGES_FILE.code);
    });

    it('valid if not specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({});
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('valid if file present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('error if default_locale missing but messages.json present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.NO_DEFAULT_LOCALE.code);
    });

    const messagesPaths = [
      '_locales/messages.json',
      's_locales/en/messages.json',
      '_locales/en/messages.json.extra',
      '_locales/en',
      '_locales',
    ];

    messagesPaths.forEach((path) => {
      it(`valid if default_locale missing and ${path}`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON();
        const files = {};
        files[path] = {};
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: { files } }
        );
        expect(manifestJSONParser.isValid).toEqual(true);
      });
    });
  });

  describe('icons', () => {
    it('does not enforce utf-8 encoding on reading binary images files', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon.svg',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon.svg': '<svg></svg>',
      };

      const fakeIO = getStreamableIO(files);

      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateIcons();

      // Expect getFileAsStream to have been called twice (for the png file
      // and the svg file).
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(2);

      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        'icons/icon-32.png',
        { encoding: null },
      ]);
      expect(fakeIO.getFileAsStream.mock.calls[1]).toEqual([
        'icons/icon.svg',
        { encoding: 'utf-8' },
      ]);
    });

    it('does not add errors if the icons are in the package', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports "absolute" paths', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: '/icons/icon-32.png',
          64: '/icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports ./ relative paths', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: './icons/icon-32.png',
          64: './icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports SVG fragments', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: './icons/icon.svg',
          64: './icons/icon.svg#full',
        },
      });
      const files = {
        'icons/icon.svg': '<svg></svg>',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('allows .. relative paths that resolve in the package', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: '../icons/icon-32.png',
          64: 'icons/../../foo/../icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not allow invalid .. relative paths', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'foo/bar/../icons/icon-32.png',
          64: 'icons/../../foo/icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "foo/icons/icon-32.png".',
      });
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "foo/icons/icon-64.png".',
      });
    });

    it('adds an error if the icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });

    it('adds a warning if the icon does not have a valid extension', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.txt',
          48: 'icons/icon.svg#frag',
          64: 'icons/icon-64.html',
          96: 'icons/icon.svg',
          128: 'tests/fixtures/icon-128.png',
        },
      });
      const files = {
        'icons/icon-32.txt': 'some random text',
        'icons/icon-64.html': '<html></html>',
        'tests/fixtures/icon-128.png': fs.createReadStream(
          'tests/fixtures/icon-128.png'
        ),
        'icons/icon.svg': '<svg></svg>',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeTruthy();
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(4);
      expect(warnings[0].code).toEqual(messages.WRONG_ICON_EXTENSION.code);
      expect(warnings[1].code).toEqual(messages.WRONG_ICON_EXTENSION.code);
    });

    describe('validate icon', () => {
      it('does not add a warning if the icon file is not corrupt', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default.png';
        const icon2048 = 'tests/fixtures/default.svg';
        const size32 = 32;
        const size2048 = 2048;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
            [size2048]: icon2048,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
          [icon2048]: fs.createReadStream(icon2048),
        };

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await Promise.all([
          manifestJSONParser.validateIcon(icon32, size32),
          manifestJSONParser.validateIcon(icon2048, size2048),
        ]);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(0);
      });

      it('adds a warning if the icon file is corrupt', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default-corrupted.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(1);
      });

      it('adds a warning if the image size is not the same as mentioned', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon33 = 'tests/fixtures/icon-33.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon33,
          },
        });
        const files = {
          [icon33]: fs.createReadStream(icon33),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon33, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(1);
        assertHasMatchingError(warnings, {
          code: messages.ICON_SIZE_INVALID,
          message: 'The size of the icon does not match the manifest.',
          description:
            'Expected icon at "tests/fixtures/icon-33.png" to be 32 pixels wide but was 33.',
        });
      });

      it('does not add a warning if the icon is SVG but the image size is not the same as mentioned', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default.svg';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(0);
      });

      it('adds an error if the dimensions of the image are not the same', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/rectangle.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeFalsy();
        const { errors } = addonLinter.collector;
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.ICON_NOT_SQUARE);
      });
    });
  });

  describe('background', () => {
    it('does not add errors if the script exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { scripts: ['foo.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the script does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { scripts: ['foo.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_BACKGROUND_FILE_NOT_FOUND,
        message:
          'A background script defined in the manifest could not be found.',
        description: 'Background script could not be found at "foo.js".',
      });
    });

    it('does not add errors if the page exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { page: 'foo.html' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'foo.html': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the page does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { page: 'foo.html' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_BACKGROUND_FILE_NOT_FOUND,
        message:
          'A background page defined in the manifest could not be found.',
        description: 'Background page could not be found at "foo.html".',
      });
    });
  });

  describe('content_scripts', () => {
    it('does not add errors if the script exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: {
            files: {
              'content_scripts/foo.js': '',
              'content_scripts/bar.css': '',
            },
          },
        }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the script does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/bar.css': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND,
        message: 'A content script defined in the manifest could not be found.',
        description:
          'Content script defined in the manifest could not be found at "content_scripts/foo.js".',
      });
    });

    it('does error if the css does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND,
        message:
          'A content script css file defined in the manifest could not be found.',
        description:
          'Content script css file defined in the manifest could not be found at "content_scripts/bar.css".',
      });
    });

    it('does error if matches entry is blocked', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['http://wbgdrb.applythrunet.co.in/GetAdmitINTV.aspx'],
            js: ['content_scripts/foo.js'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_INVALID_CONTENT.code,
        message: 'Forbidden content found in add-on.',
        description: 'This add-on contains forbidden content.',
      });
    });
  });

  describe('deprecated properties', () => {
    // NOTE: this test currently checks that we don't add any unexpected validation errors
    // for schema properties marked as deprecated (until we add proper handling for them).
    it('does not add validation error for manifest properties marked as deprecated', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        options_ui: {
          page: 'options.html',
          unexpected_property: true,
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'options.html': '' } } }
      );

      // Ignore warnings triggered by the rules related to mdn-browser-compat-data.
      const warnings = linter.collector.warnings.filter((msg) => {
        return msg.code !== 'KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION';
      });

      expect(manifestJSONParser.isValid).toBeTruthy();
      expect(linter.collector.errors.length).toBe(0);
      expect(warnings.length).toBe(0);
    });
  });

  describe('dictionary', () => {
    it('supports simple valid dictionary', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('does error if the dictionary file does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_NOT_FOUND,
        message:
          'A dictionary file defined in the manifest could not be found.',
        description:
          'Dictionary file defined in the manifest could not be found at "path/to/fr.dic".',
      });
    });

    it('does error if the dictionary file exists but not the .aff file', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { '/path/to/fr.dic': '' } },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_NOT_FOUND,
        message:
          'A dictionary file defined in the manifest could not be found.',
        description:
          'Dictionary file defined in the manifest could not be found at "path/to/fr.aff".',
      });
    });

    it('throws error on dictionary with missing applications', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = JSON.stringify({
        manifest_version: 2,
        name: 'My French Dictionary',
        version: '57.0a1',
        dictionaries: {
          fr: '/path/to/fr.dic',
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary with missing applications->gecko', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        applications: {},
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary with missing applications->gecko->id', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        applications: { gecko: {} },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary file not ending with .dic', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        dictionaries: { fr: 'invalid.txt' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('throws error on add-on containing multiple dictionaries', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        dictionaries: { fr: 'fr.dic', de: 'de.dic' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_MULTIPLE_DICTS.code,
        message: 'The manifest contains multiple dictionaries.',
        description:
          'Multiple dictionaries were defined in the manifest, which is unsupported.',
      });
    });

    it('throws error on dictionary containing empty dictionaries object', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({ dictionaries: {} });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_EMPTY_DICTS.code,
        message:
          'The manifest contains a dictionaries object, but it is empty.',
        description:
          'A dictionaries object was defined in the manifest, but it was empty.',
      });
    });

    it('throws error on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({ content_scripts: ['foo.js'] });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/content_scripts" is an invalid additional property',
        description: 'Your JSON file could not be parsed.',
      });
    });
  });

  describe('langpack', () => {
    it('supports simple valid langpack', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('throws warning on missing langpack_id', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({ langpack_id: null });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('throws error on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({ content_scripts: ['foo.js'] });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/content_scripts" is an invalid additional property',
        description: 'Your JSON file could not be parsed.',
      });
    });
  });

  describe('static theme', () => {
    it('supports simple valid static theme', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validStaticThemeManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('throws warning on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validStaticThemeManifestJSON({
        content_scripts: ['foo.js'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/content_scripts" is an invalid additional property',
        description: 'Your JSON file could not be parsed.',
      });
    });

    it('adds a validation error on missing theme image files', async () => {
      const propName = 'theme.images.frame';
      const fileName = 'missing-image-file.png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        {
          io: { files: {} },
        }
      );

      await manifestJSONParser.validateStaticThemeImages();

      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_THEME_IMAGE_NOT_FOUND,
        message: `Theme image for "${propName}" could not be found in the package`,
        description: `Theme image for "${propName}" could not be found at "${fileName}"`,
      });
    });

    it('adds a validation error on theme image file with unsupported file extension', async () => {
      const files = {
        'unsupported-image-ext.tiff': '',
        'unsupported-image-ext.webp': '',
      };
      const fileNames = Object.keys(files);

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileNames[0],
            additional_backgrounds: fileNames[1],
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: { files } }
      );

      await manifestJSONParser.validateStaticThemeImages();

      expect(manifestJSONParser.isValid).toEqual(false);

      for (const name of fileNames) {
        assertHasMatchingError(linter.collector.errors, {
          code: messages.MANIFEST_THEME_IMAGE_WRONG_EXT,
          message: `Theme image file has an unsupported file extension`,
          description: `Theme image file at "${name}" has an unsupported file extension`,
        });
      }
    });

    it('adds a validation error on theme image file in unsupported formats', async () => {
      const files = {
        'tiff-image-with-png-filext.png': EMPTY_TIFF,
        'webp-image-with-png-filext.png': EMPTY_WEBP,
      };
      const fileNames = Object.keys(files);
      const fileMimes = ['image/tiff', 'image/webp'];

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileNames[0],
            addional_backgrounds: fileNames[1],
          },
        },
      });

      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(2);
      for (let i = 0; i < fileNames; i++) {
        expect(fakeIO.getFileAsStream.mock.calls[i]).toEqual([
          fileNames[i],
          { encoding: null },
        ]);
      }

      expect(manifestJSONParser.isValid).toEqual(false);

      for (let i = 0; i < fileNames; i++) {
        const fileName = fileNames[i];
        const fileMime = fileMimes[i];
        assertHasMatchingError(linter.collector.errors, {
          code: messages.MANIFEST_THEME_IMAGE_WRONG_MIME,
          message: `Theme image file has an unsupported mime type`,
          description: `Theme image file at "${fileName}" has the unsupported mime type "${fileMime}"`,
        });
      }
    });

    it('adds a validation warning on supported theme image mime with file extension mismatch', async () => {
      const fileName = 'png-image-with-gif-filext.gif';
      const fileMime = 'image/png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      const files = { [fileName]: EMPTY_PNG };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(1);
      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        fileName,
        { encoding: null },
      ]);

      expect(manifestJSONParser.isValid).toEqual(true);
      assertHasMatchingError(linter.collector.warnings, {
        code: messages.MANIFEST_THEME_IMAGE_MIME_MISMATCH,
        message: `Theme image file mime type does not match its file extension`,
        description: oneLine`Theme image file extension at "${fileName}"
                             does not match its actual mime type "${fileMime}"`,
      });
    });

    it('adds a validation error if unable to validate theme images files mime type', async () => {
      const fileName = 'corrupted-image-file.png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      // Set the image file content as empty, so that the validation is going to be
      // unable to retrive the file mime type.
      const files = { [fileName]: '' };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(1);
      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        fileName,
        { encoding: null },
      ]);

      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_THEME_IMAGE_CORRUPTED,
        message: `Corrupted theme image file`,
        description: `Theme image file at "${fileName}" is corrupted`,
      });
    });

    it('validates all image paths when the manifest property value is an array', async () => {
      const linter = new Linter({ _: ['bar'] });
      const imageFiles = [
        'bg1.svg',
        'bg2.png',
        'bg2-apng.png',
        'bg3.gif',
        'bg4.jpg',
        'bg4-1.jpeg',
      ];
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            additional_backgrounds: imageFiles,
          },
        },
      });

      const files = {
        'bg1.svg': EMPTY_SVG,
        'bg2.png': EMPTY_PNG,
        'bg2-apng.png': EMPTY_APNG,
        'bg3.gif': EMPTY_GIF,
        'bg4.jpg': EMPTY_JPG,
        'bg4-1.jpeg': EMPTY_JPG,
      };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read all the image files.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(imageFiles.length);
      expect(fakeIO.getFileAsStream.mock.calls.map((call) => call[0])).toEqual(
        imageFiles
      );

      const { errors, warnings } = linter.collector;
      expect({ errors, warnings }).toEqual({
        errors: [],
        warnings: [],
      });
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('considers theme.images as optional', async () => {
      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          colors: {
            frame: '#adb09f',
            tab_background_text: '#000',
            background_tab_text: 'rgba(255, 192, 0, 0)',
            bookmark_text: 'rgb(255, 255, 255),',
            toolbar_field_text: 'hsl(120, 100%, 50%)',
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: { files: {} } }
      );

      await manifestJSONParser.validateStaticThemeImages();

      const { errors, warnings } = linter.collector;
      expect({ errors, warnings }).toEqual({
        errors: [],
        warnings: [],
      });
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    describe('deprecated LWT aliases', () => {
      it('does add validation warnings for LWT alias manifest properties marked as deprecated', () => {
        const linter = new Linter({ _: ['bar'] });
        const manifest = validStaticThemeManifestJSON({
          theme: {
            images: {
              headerURL: 'header.png',
            },
            colors: {
              accentcolor: '#000',
              textcolor: '#000',
              toolbar_text: '#000',
            },
          },
        });
        const manifestJSONParser = new ManifestJSONParser(
          manifest,
          linter.collector,
          { io: { files: {} } }
        );

        const { errors, warnings } = linter.collector;

        expect(manifestJSONParser.isValid).toBeFalsy();

        expect(errors).toEqual([]);

        const actualWarnings = warnings.map((warn) => {
          const { code, dataPath, file, message, description } = warn;
          return { code, dataPath, file, message, description };
        });

        const commonWarnProps = { ...messages.MANIFEST_THEME_LWT_ALIAS };
        const expectedWarnings = [
          {
            ...commonWarnProps,
            dataPath: '/theme/images/headerURL',
          },
          {
            ...commonWarnProps,
            dataPath: '/theme/colors/accentcolor',
          },
          {
            ...commonWarnProps,
            dataPath: '/theme/colors/textcolor',
          },
          {
            ...commonWarnProps,
            dataPath: '/theme/colors/toolbar_text',
          },
        ];

        expect(actualWarnings).toEqual(expectedWarnings);
      });
    });
  });

  describe('locales', () => {
    it('error if messages.json is  missing in language directory', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        default_locale: 'en',
      });
      const directory = {
        path: 'tests/fixtures/locales/',
        files: {
          '_locales/en/messages.json': { size: 1000 },
          '_locales/de/messages.json': { size: 1120 },
        },
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: directory }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.NO_MESSAGES_FILE_IN_LOCALES);
    });

    it('error if messages.json is  not missing in language directory', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        default_locale: 'en',
      });
      const directory = {
        path: 'tests/fixtures/locales/',
        files: {
          '_locales/en/messages.json': { size: 1000 },
          '_locales/de/messages.json': { size: 1120 },
          '_locales/hi/messages.json': { size: 1120 },
        },
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: directory }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { errors } = addonLinter.collector;
      expect(errors.length).toEqual(0);
    });
  });
});
