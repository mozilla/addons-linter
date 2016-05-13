import ManifestJSONParser from 'parsers/manifestjson';
import Linter from 'linter';

import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import * as messages from 'messages';
import { validManifestJSON } from '../helpers';

describe('ManifestJSONParser', function() {

  it('should show a message if bad JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var manifestJSONParser = new ManifestJSONParser('blah',
                                                    addonLinter.collector);
    assert.equal(manifestJSONParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.MANIFEST_JSON_INVALID.code);
    assert.include(errors[0].message, 'Invalid JSON in manifest file.');

    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.manifestVersion, null);
    assert.equal(metadata.name, null);
    assert.equal(metadata.version, null);
  });

});

describe('ManifestJSONParser manifestVersion', function() {

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


describe('ManifestJSONParser type', function() {

  it('should have the right type', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json);
    assert.equal(manifestJSONParser.isValid, true);
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.type, PACKAGE_EXTENSION);
  });

  it('should not allow the type to be user-specified', () => {
    var json = validManifestJSON({type: 'whatevs'});
    var manifestJSONParser = new ManifestJSONParser(json);
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
      var parser = new ManifestJSONParser(validManifestJSON());
      var message = parser.errorLookup({dataPath: ''});
      assert.equal(message.code, messages.MANIFEST_JSON_INVALID.code);
    });
  }

  it('should return required for missing', () => {
    var parser = new ManifestJSONParser(validManifestJSON());
    var message = parser.errorLookup({dataPath: '', keyword: 'required'});
    assert.equal(message.code, messages.MANIFEST_FIELD_REQUIRED.code);
  });

  it('should return invalid for wrong type', () => {
    var parser = new ManifestJSONParser(validManifestJSON());
    var message = parser.errorLookup({dataPath: '', keyword: 'type'});
    assert.equal(message.code, messages.MANIFEST_FIELD_INVALID.code);
  });

  it('should return permission for wrong type', () => {
    var parser = new ManifestJSONParser(validManifestJSON());
    var message = parser.errorLookup({dataPath: '/permissions/0'});
    assert.equal(message.code, messages.MANIFEST_PERMISSIONS.code);
  });
});


describe('ManifestJSONParser enum', function() {

  it('should only return one message', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({permissions: ['tabs', 'wat']});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    assert.equal(manifestJSONParser.isValid, false);
    var warnings = addonLinter.collector.warnings;
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].code, 'MANIFEST_PERMISSIONS');
    assert.include(warnings[0].message,
                   '/permissions: Unknown permissions "wat" at 1.');
  });
});


describe('ManifestJSONParser name', function() {

  it('should extract a name', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON({name: 'my-awesome-ext'});
    var manifestJSONParser = new ManifestJSONParser(json);
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
    assert.equal(errors[0].code, 'MANIFEST_FIELD_REQUIRED');
    assert.include(errors[0].message, '/name');
  });

  it('should collect an error on non-string name value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({name: 1});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    assert.equal(manifestJSONParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_FIELD_INVALID');
    assert.include(errors[0].message, '/name');
  });

});

describe('ManifestJSONParser version', function() {

  it('should extract a version', () => {
    var json = validManifestJSON({version: '1.0'});
    var manifestJSONParser = new ManifestJSONParser(json);
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
    assert.equal(errors[0].code, 'MANIFEST_FIELD_REQUIRED');
    assert.include(errors[0].message, '/version');
  });

  it('should collect an error on non-string version value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({version: 1});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    assert.equal(manifestJSONParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_FIELD_INVALID');
    assert.include(errors[0].message, '/version');
  });

});

describe('ManifestJSONParser content security policy', function() {

  it('should warn that csp will mean more review', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({content_security_policy: 'wat?'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    assert.equal(manifestJSONParser.isValid, true);
    var warnings = addonLinter.collector.warnings;
    assert.equal(warnings[0].code, 'MANIFEST_CSP');
    assert.include(warnings[0].message, 'content_security_policy');
  });

});

describe('ManifestJSONParser update_url', function() {

  it('is not allowed', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({update_url: ''});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector,
                                                    {selfHosted: false});
    assert.equal(manifestJSONParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_UPDATE_URL');
    assert.include(errors[0].message, 'update_url');
  });

  it('is allowed if self-hosted', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({update_url: ''});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector,
                                                    {selfHosted: true});
    manifestJSONParser.selfHosted = true;
    assert.equal(manifestJSONParser.isValid, true);
  });
});
