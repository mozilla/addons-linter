import Linter from 'linter';
import ManifestJSONParser from 'parsers/manifestjson';

import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import * as messages from 'messages';
import { assertHasMatchingError, validManifestJSON } from '../helpers';

describe('ManifestJSONParser', function() {

  it('should have empty metadata if bad JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var manifestJSONParser = new ManifestJSONParser('blah',
                                                    addonLinter.collector);
    expect(manifestJSONParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');

    var metadata = manifestJSONParser.getMetadata();
    expect(metadata.manifestVersion).toEqual(null);
    expect(metadata.name).toEqual(null);
    expect(metadata.version).toEqual(null);
  });

  describe('id', function() {

    it('should return the correct id', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual('{daf44bf7-a45e-4450-979c-91cf07434c3d}');
    });

    it('should fail on invalid id', () => {
      // This is probably covered in other tests, but verifies that if the
      // id is something incorrect, you shouldn't even be calling getMetadata.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({applications: {gecko: {id: 'wat'}}});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/applications\/gecko\/id" should match pattern/,
      });
    });

    it('should return null if undefined', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({applications: {}});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual(null);
    });

  });

  describe('manifestVersion', function() {

    it('should collect an error on invalid manifest_version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({manifest_version: 'whatever'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should collect an error with numeric string value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({manifest_version: '1'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should have the right manifestVersion', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.manifestVersion).toEqual(VALID_MANIFEST_VERSION);
    });

  });

  describe('bad permissions', function() {

    it('should not error if permission is a string (even if unknown)', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({
        permissions: [
          'identity',
          'fileSystem',
        ],
      });

      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var warnings = addonLinter.collector.warnings;
      expect(addonLinter.collector.errors.length).toBe(0);
      assertHasMatchingError(warnings, {
        code: messages.MANIFEST_PERMISSIONS.code,
        message: /Unknown permissions "fileSystem"/,
      });
    });

    it('should error if permission is not a string', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({
        permissions: [
          'identity',
          {
            fileSystem: ['write'],
          },
        ],
      });

      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should be string');
    });

    it('should error if permission is duplicated', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({
        permissions: [
          'identity',
          'identity',
        ],
      });

      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_BAD_PERMISSION.code);
      expect(errors[0].message).toContain('should NOT have duplicate items');
    });

  });


  describe('type', function() {

    it('should have the right type', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });

    it('should not allow the type to be user-specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({type: 'whatevs'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });

  });


  describe('ManfiestJSONParser lookup', function() {

    var unknownDataPaths = [
      '',
      '/permissions/foo',
      '/permissions/',
    ];
    for (var unknownData in unknownDataPaths) {
      it(`should return invalid for ${unknownData}`, () => {
        var addonLinter = new Linter({_: ['bar']});
        var parser = new ManifestJSONParser(validManifestJSON(),
                                            addonLinter.collector);
        var message = parser.errorLookup({dataPath: ''});
        expect(message.code).toEqual(messages.JSON_INVALID.code);
      });
    }

    it('should return required for missing', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '', keyword: 'required'});
      expect(message.code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
    });

    it('should return invalid for wrong type', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '', keyword: 'type'});
      expect(message.code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
    });

    it('should return permission for wrong type', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '/permissions/0'});
      expect(message.code).toEqual(messages.MANIFEST_PERMISSIONS.code);
    });
  });


  describe('enum', function() {

    it('should only return one message', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({permissions: ['tabs', 'wat']});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var warnings = addonLinter.collector.warnings;
      expect(warnings.length).toEqual(1);
      expect(warnings[0].code).toEqual(messages.MANIFEST_PERMISSIONS.code);
      expect(warnings[0].message).toContain(
        '/permissions: Unknown permissions "wat" at 1.'
      );
    });
  });


  describe('name', function() {

    it('should extract a name', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: 'my-awesome-ext'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.name).toEqual('my-awesome-ext');
    });

    it('should collect an error on missing name value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: undefined});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/name');
    });

    it('should collect an error on non-string name value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: 1});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/name');
    });

  });

  describe('version', function() {

    it('should extract a version', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: '1.0'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var metadata = manifestJSONParser.getMetadata();
      expect(metadata.version).toEqual('1.0');
    });

    it('should collect an error on missing version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: undefined});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect an error on non-string version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: 1});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/version');
    });

    it('should collect a notice on toolkit version values', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: '1.0.0.0pre0'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var notices = addonLinter.collector.notices;
      expect(notices[0].code).toEqual(messages.PROP_VERSION_TOOLKIT_ONLY.code);
      expect(notices[0].message).toContain('version');
    });

  });

  describe('content security policy', function() {

    it('should warn that csp will mean more review', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({content_security_policy: 'wat?'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
      var warnings = addonLinter.collector.warnings;
      expect(warnings[0].code).toEqual(messages.MANIFEST_CSP.code);
      expect(warnings[0].message).toContain('content_security_policy');
    });

  });

  describe('update_url', function() {

    // Chrome Web Extensions put their `update_url` in the root of their
    // manifest, which Firefox ignores. We should notify the user it will
    // be ignored, but that's all.
    it('is allowed but should notify in the manifest', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({update_url: 'https://foo.com/bar'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector,
                                                      {selfHosted: false});
      expect(manifestJSONParser.isValid).toEqual(true);
      var notices = addonLinter.collector.notices;
      expect(notices[0].code).toEqual(messages.MANIFEST_UNUSED_UPDATE.code);
      expect(notices[0].message).toContain('update_url');
    });

    // applications.gecko.update_url isn't allowed if the add-on is being
    // hosted on AMO.
    it('is not allowed', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({
        applications: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector,
                                                      {selfHosted: false});
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.MANIFEST_UPDATE_URL.code);
      expect(errors[0].message).toContain('update_url');
    });

    it('is not an issue if self-hosted', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({
        applications: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector,
                                                      {selfHosted: true});
      manifestJSONParser.selfHosted = true;
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toBe(0);
    });
  });

  describe('schema error overrides', function() {
    // https://github.com/mozilla/addons-linter/issues/732
    it('uses a modified error message', () => {
      var addonLinter = new Linter({_: ['bar']});
      // 'scripts' intentionally misspelled as 'script'.
      var json = validManifestJSON({background: {script: ['background.js']}});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      assertHasMatchingError(errors, {
        code: messages.JSON_INVALID.code,
        message: '"/background/script" is not a valid key or has invalid '
                 + 'extra properties',
      });
    });
  });

  describe('default_locale', function() {
    it('error if missing messages.json', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({default_locale: 'fr'});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, {io: {files: {}}});
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.NO_MESSAGES_FILE.code);
    });

    it('valid if not specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('valid if file present', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({default_locale: 'fr'});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        {io: {files: {'_locales/fr/messages.json': {}}}});
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('error if default_locale missing but messages.json present', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        {io: {files: {'_locales/fr/messages.json': {}}}});
      expect(manifestJSONParser.isValid).toEqual(false);
      var errors = addonLinter.collector.errors;
      expect(errors[0].code).toEqual(messages.NO_DEFAULT_LOCALE.code);
    });

    let messages_paths = [
      '_locales/messages.json',
      's_locales/en/messages.json',
      '_locales/en/messages.json.extra',
      '_locales/en',
      '_locales',
    ];

    for (let path of messages_paths) {
      it(`valid if default_locale missing and ${path}`, () => {
        var addonLinter = new Linter({_: ['bar']});
        var json = validManifestJSON();
        let files = {};
        files[path] = {};
        var manifestJSONParser = new ManifestJSONParser(
          json, addonLinter.collector,
          {io: {files: files}});
        expect(manifestJSONParser.isValid).toEqual(true);
      });
    }
  });

  describe('icons', () => {
    it('does not add errors if there are no icons', () => {
      const linter = new Linter({_: ['bar']});
      const json = validManifestJSON();
      delete json.icons;
      const manifestJSONParser = new ManifestJSONParser(
        json, linter.collector, {io: {files: []}});
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not add errors if the icons are in the package', () => {
      const addonLinter = new Linter({_: ['bar']});
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
        json, addonLinter.collector, {io: {files}});
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports "absolute" paths', () => {
      const addonLinter = new Linter({_: ['bar']});
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
        json, addonLinter.collector, {io: {files}});
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports ./ relative paths', () => {
      const addonLinter = new Linter({_: ['bar']});
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
        json, addonLinter.collector, {io: {files}});
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not allow .. relative paths', () => {
      const addonLinter = new Linter({_: ['bar']});
      const json = validManifestJSON({
        icons: {
          32: '../icons/icon-32.png',
          64: 'icons/../../foo/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': '89<PNG>thisistotallysomebinary',
        'icons/icon-64.png': '89<PNG>thisistotallysomebinary',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector, {io: {files}});
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "../icons/icon-32.png".',
      });
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description:
          'Icon could not be found at "icons/../../foo/icon-64.png".',
      });
    });

    it('adds an error if the icon is not in the package', () => {
      const addonLinter = new Linter({_: ['bar']});
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
        json, addonLinter.collector, {io: {files}});
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
