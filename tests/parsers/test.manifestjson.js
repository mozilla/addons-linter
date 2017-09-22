import Linter from 'linter';
import ManifestJSONParser from 'parsers/manifestjson';
import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import * as messages from 'messages';

import { assertHasMatchingError, validManifestJSON } from '../helpers';

describe('ManifestJSONParser', () => {
  it('should have empty metadata if bad JSON', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const manifestJSONParser = new ManifestJSONParser('blah',
      addonLinter.collector);
    expect(manifestJSONParser.isValid).toEqual(false);
    const errors = addonLinter.collector.errors;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');

    const metadata = manifestJSONParser.getMetadata();
    expect(metadata.manifestVersion).toEqual(null);
    expect(metadata.name).toEqual(null);
    expect(metadata.version).toEqual(null);
  });


  describe('id', () => {
    it('should return the correct id', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual('{daf44bf7-a45e-4450-979c-91cf07434c3d}');
    });

    it('should fail on invalid id', () => {
      // This is probably covered in other tests, but verifies that if the
      // id is something incorrect, you shouldn't even be calling getMetadata.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ applications: { gecko: { id: 'wat' } } });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/applications\/gecko\/id" should match pattern/,
      });
    });

    it('should return null if undefined', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ applications: {} });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual(null);
    });
  });

  describe('manifestVersion', () => {
    it('should collect an error on invalid manifest_version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: 'whatever' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should collect an error with numeric string value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: '1' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });
    
    it('should have the valid key ', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.INVALID_KEY.code);
    });

    it('should have the right manifestVersion', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.manifestVersion).toEqual(VALID_MANIFEST_VERSION);
    });
  });

  describe('bad permissions', () => {
    it('should not error if permission is a string (even if unknown)', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: [
          'identity',
          'fileSystem',
        ],
      });

      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const warnings = addonLinter.collector.warnings;
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

      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should be string');
    });

    it('should error if permission is duplicated', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: [
          'identity',
          'identity',
        ],
      });

      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should NOT have duplicate items');
    });
  });


  describe('type', () => {
    it('should have the right type', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });

    it('should not allow the type to be user-specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ type: 'whatevs' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });
  });

  describe('ManfiestJSONParser lookup', () => {
    const unknownDataPaths = [
      '',
      '/permissions/foo',
      '/permissions/',
    ];
    unknownDataPaths.forEach((unknownData) => {
      it(`should return invalid for ${unknownData}`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const parser = new ManifestJSONParser(validManifestJSON(),
          addonLinter.collector);
        const message = parser.errorLookup({ dataPath: '' });
        expect(message.code).toEqual(messages.JSON_INVALID.code);
      });
    });

    it('should return required for missing', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(validManifestJSON(),
        addonLinter.collector);
      const message = parser.errorLookup({ dataPath: '', keyword: 'required' });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
    });

    it('should return invalid for wrong type', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(validManifestJSON(),
        addonLinter.collector);
      const message = parser.errorLookup({ dataPath: '', keyword: 'type' });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
    });

    it('should return permission for wrong type', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(validManifestJSON(),
        addonLinter.collector);
      const message = parser.errorLookup({ dataPath: '/permissions/0' });
      expect(message.code).toEqual(messages.MANIFEST_PERMISSIONS.code);
    });
  });


  describe('enum', () => {
    it('should only return one message', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ permissions: ['tabs', 'wat'] });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const warnings = addonLinter.collector.warnings;
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
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.name).toEqual('my-awesome-ext');
    });

    it('should collect an error on missing name value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: undefined });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/name');
    });

    it('should collect an error on non-string name value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: 1 });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/name');
    });
  });

  describe('version', () => {
    it('should extract a version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: '1.0' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.version).toEqual('1.0');
    });

    it('should collect an error on missing version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: undefined });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect an error on non-string version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: 1 });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect a notice on toolkit version values', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: '1.0.0.0pre0' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const notices = addonLinter.collector.notices;
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
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      const notices = addonLinter.collector.notices;
      expect(notices[0].code).toEqual(messages.STRICT_MAX_VERSION.code);
      expect(notices[0].message).toContain('strict_max_version');
    });
  });

  describe('content security policy', () => {
    it('should warn on rules allowing remote code execution', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_security_policy: 'foo',
      });
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector);

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
      ];

      invalidValues.forEach((invalidValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const json = validManifestJSON({
          content_security_policy: invalidValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json, addonLinter.collector);

        expect(manifestJSONParser.isValid).toEqual(true);
        const warnings = addonLinter.collector.warnings;
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
      ];

      validValues.forEach((validValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const json = validManifestJSON({
          content_security_policy: validValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json, addonLinter.collector);

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
        json, addonLinter.collector);

      expect(manifestJSONParser.isValid).toEqual(true);
      const warnings = addonLinter.collector.warnings;
      expect(warnings[0].code).toEqual(
        messages.MANIFEST_CSP_UNSAFE_EVAL.code);
      expect(warnings[0].message).toEqual(
        "Using 'eval' has strong security and performance implications.");
    });
  });

  describe('update_url', () => {
    // Chrome Web Extensions put their `update_url` in the root of their
    // manifest, which Firefox ignores. We should notify the user it will
    // be ignored, but that's all.
    it('is allowed but should notify in the manifest', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ update_url: 'https://foo.com/bar' });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector,
        { selfHosted: false });
      expect(manifestJSONParser.isValid).toEqual(true);
      const notices = addonLinter.collector.notices;
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
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector,
        { selfHosted: false });
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
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
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector,
        { selfHosted: true });
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
      const json = validManifestJSON({ background: { script: ['background.js'] } });
      const manifestJSONParser = new ManifestJSONParser(json,
        addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      assertHasMatchingError(errors, {
        code: messages.JSON_INVALID.code,
        message: '"/background/script" is not a valid key or has invalid '
                 + 'extra properties',
      });
    });
  });

  describe('default_locale', () => {
    it('error if missing messages.json', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files: {} } });
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.NO_MESSAGES_FILE.code);
    });

    it('valid if not specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({});
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('valid if file present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } });
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('error if default_locale missing but messages.json present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } });
      expect(manifestJSONParser.isValid).toEqual(false);
      const errors = addonLinter.collector.errors;
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
          json, addonLinter.collector,
          { io: { files } });
        expect(manifestJSONParser.isValid).toEqual(true);
      });
    });
  });

  describe('icons', () => {
    it('does not add errors if there are no icons', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      delete json.icons;
      const manifestJSONParser = new ManifestJSONParser(
        json, linter.collector, { io: { files: [] } });
      expect(manifestJSONParser.isValid).toBeTruthy();
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
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
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
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
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
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
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
        json, addonLinter.collector, { io: { files } });
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
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not allow invalid .. relative paths', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'foo/bar/../icons/icon-32.png',
          64: 'icons/../../foo/icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description:
          'Icon could not be found at "foo/icons/icon-32.png".',
      });
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description:
          'Icon could not be found at "foo/icons/icon-64.png".',
      });
    });

    it('adds an error if the icon is not in the package', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, { io: { files } });
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });
  });
});
