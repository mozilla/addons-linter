import ManifestJSONParser from 'parsers/manifestjson';
import Validator from 'validator';

import * as messages from 'messages';
import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';

import { validManifestJSON } from '../helpers';


describe('ManifestJSONParser._getManifestVersion()', function() {

  it('should collect an error on invalid manifest_version value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({manifest_version: 'whatever'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    var manifestVersion = manifestJSONParser._getManifestVersion();
    assert.equal(manifestVersion, null);
    var errors = addonValidator.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.MANIFEST_VERSION_INVALID.code);
  });

  it('should have the right manifestVersion', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    var manifestVersion = manifestJSONParser._getManifestVersion();
    assert.equal(manifestVersion, VALID_MANIFEST_VERSION);
  });

});


describe('ManifestJSONParser._getType()', function() {

  it('should have the right type', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json);
    var type = manifestJSONParser._getType();
    assert.equal(type, PACKAGE_EXTENSION);
  });

  it('should not allow the type to be user-specified', () => {
    var json = validManifestJSON({type: 'whatevs'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var type = manifestJSONParser._getType();
    assert.equal(type, PACKAGE_EXTENSION);
  });

});


describe('ManifestJSONParser._getName()', function() {

  it('should extract a name', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON({name: 'my-awesome-ext'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var name = manifestJSONParser._getName();
    assert.equal(name, 'my-awesome-ext');
  });

  it('should collect an error on missing name value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({name: undefined});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    var name = manifestJSONParser._getName();
    assert.equal(name, null);
    var errors = addonValidator.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.PROP_NAME_MISSING.code);
  });

});

describe('ManifestJSONParser._getVersion()', function() {

  it('should extract a version', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON({version: '1.0'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var version = manifestJSONParser._getVersion();
    assert.equal(version, '1.0');
  });

  it('should collect an error on missing version value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({version: undefined});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    var name = manifestJSONParser._getVersion();
    assert.equal(name, null);
    var errors = addonValidator.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.PROP_VERSION_MISSING.code);
  });

});
