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
    assert.equal(manifestJSONParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.JSON_INVALID.code);
    assert.include(errors[0].message, 'Your JSON is not valid.');

    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.manifestVersion, null);
    assert.equal(metadata.name, null);
    assert.equal(metadata.version, null);
  });

  describe('id', function() {

    it('should return the correct id', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.id, '{daf44bf7-a45e-4450-979c-91cf07434c3d}');
    });

    it('should fail on invalid id', () => {
      // This is probably covered in other tests, but verifies that if the
      // id is something incorrect, you shouldn't even be calling getMetadata.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({applications: {gecko: {id: 'wat'}}});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
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
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.id, null);
    });

  });

  describe('manifestVersion', function() {

    it('should collect an error on invalid manifest_version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({manifest_version: 'whatever'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_INVALID.code);
      assert.include(errors[0].message, '/manifest_version');
    });

    it('should collect an error with numeric string value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({manifest_version: '1'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_INVALID.code);
      assert.include(errors[0].message, '/manifest_version');
    });

    it('should have the right manifestVersion', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.manifestVersion, VALID_MANIFEST_VERSION);
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
      assert.equal(manifestJSONParser.isValid, false);
      var warnings = addonLinter.collector.warnings;
      assert.lengthOf(addonLinter.collector.errors, 0);
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
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_BAD_PERMISSION.code);
      assert.include(errors[0].message, 'should be equal to one');
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
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_BAD_PERMISSION.code);
      assert.include(errors[0].message, 'should NOT have duplicate items');
    });

  });


  describe('type', function() {

    it('should have the right type', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.type, PACKAGE_EXTENSION);
    });

    it('should not allow the type to be user-specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({type: 'whatevs'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.type, PACKAGE_EXTENSION);
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
        assert.equal(message.code, messages.JSON_INVALID.code);
      });
    }

    it('should return required for missing', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '', keyword: 'required'});
      assert.equal(message.code, messages.MANIFEST_FIELD_REQUIRED.code);
    });

    it('should return invalid for wrong type', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '', keyword: 'type'});
      assert.equal(message.code, messages.MANIFEST_FIELD_INVALID.code);
    });

    it('should return permission for wrong type', () => {
      var addonLinter = new Linter({_: ['bar']});
      var parser = new ManifestJSONParser(validManifestJSON(),
                                          addonLinter.collector);
      var message = parser.errorLookup({dataPath: '/permissions/0'});
      assert.equal(message.code, messages.MANIFEST_PERMISSIONS.code);
    });
  });


  describe('enum', function() {

    it('should only return one message', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({permissions: ['tabs', 'wat']});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var warnings = addonLinter.collector.warnings;
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0].code, messages.MANIFEST_PERMISSIONS.code);
      assert.include(warnings[0].message,
                    '/permissions: Unknown permissions "wat" at 1.');
    });
  });


  describe('name', function() {

    it('should extract a name', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: 'my-awesome-ext'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.name, 'my-awesome-ext');
    });

    it('should collect an error on missing name value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: undefined});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_REQUIRED.code);
      assert.include(errors[0].message, '/name');
    });

    it('should collect an error on non-string name value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({name: 1});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_INVALID.code);
      assert.include(errors[0].message, '/name');
    });

  });

  describe('version', function() {

    it('should extract a version', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: '1.0'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var metadata = manifestJSONParser.getMetadata();
      assert.equal(metadata.version, '1.0');
    });

    it('should collect an error on missing version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: undefined});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_REQUIRED.code);
      assert.include(errors[0].message, '/version');
    });

    it('should collect an error on non-string version value', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: 1});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_FIELD_INVALID.code);
      assert.include(errors[0].message, '/version');
    });

    it('should collect a notice on toolkit version values', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({version: '1.0.0.0pre0'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var notices = addonLinter.collector.notices;
      assert.equal(notices[0].code, messages.PROP_VERSION_TOOLKIT_ONLY.code);
      assert.include(notices[0].message, 'version');
    });

  });

  describe('content security policy', function() {

    it('should warn that csp will mean more review', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({content_security_policy: 'wat?'});
      var manifestJSONParser = new ManifestJSONParser(json,
                                                      addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
      var warnings = addonLinter.collector.warnings;
      assert.equal(warnings[0].code, messages.MANIFEST_CSP.code);
      assert.include(warnings[0].message, 'content_security_policy');
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
      assert.equal(manifestJSONParser.isValid, true);
      var notices = addonLinter.collector.notices;
      assert.equal(notices[0].code, messages.MANIFEST_UNUSED_UPDATE.code);
      assert.include(notices[0].message, 'update_url');
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
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.MANIFEST_UPDATE_URL.code);
      assert.include(errors[0].message, 'update_url');
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
      assert.equal(manifestJSONParser.isValid, true);
      assert.lengthOf(addonLinter.collector.warnings, 0);
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
      assert.equal(manifestJSONParser.isValid, false);
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
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.NO_MESSAGES_FILE.code);
    });

    it('valid if not specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
    });

    it('valid if file present', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({default_locale: 'fr'});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        {io: {files: {'_locales/fr/messages.json': {}}}});
      assert.equal(manifestJSONParser.isValid, true);
    });

    it('error if default_locale missing but messages.json present', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON();
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        {io: {files: {'_locales/fr/messages.json': {}}}});
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.NO_DEFAULT_LOCALE.code);
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
        assert.equal(manifestJSONParser.isValid, true);
      });
    }
  });

  describe('theme', function() {
    it('valid if not specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector);
      assert.equal(manifestJSONParser.isValid, true);
    });

    it('error if theme is specified', () => {
      var addonLinter = new Linter({_: ['bar']});
      var json = validManifestJSON({theme: {}});
      var manifestJSONParser = new ManifestJSONParser(
        json, addonLinter.collector,
        {});
      assert.equal(manifestJSONParser.isValid, false);
      var errors = addonLinter.collector.errors;
      assert.equal(errors[0].code, messages.STATIC_THEMES_UNSUPPORTED.code);
    });
  });
});
