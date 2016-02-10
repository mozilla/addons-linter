import ManifestJSONParser from 'parsers/manifestjson';
import Linter from 'linter';

import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';

import { validManifestJSON } from '../helpers';


describe('ManifestJSONParser', () => {
  it("should throw if validate() isn't called before getMetadata()", () => {
    assert.throws(() => {
      var json = validManifestJSON({manifest_version: 'whatever'});
      var manifestJSONParser = new ManifestJSONParser(json);
      manifestJSONParser.getMetadata();
    }, Error, /validate\(\) must be called/);
  });
});

describe('ManifestJSONParser manifestVersion', function() {

  it('should collect an error on invalid manifest_version value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({manifest_version: 'whatever'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/manifest_version');
  });

  it('should collect an error with numeric string value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({manifest_version: '1'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/manifest_version');
  });

  it('should have the right manifestVersion', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.manifestVersion, VALID_MANIFEST_VERSION);
    assert.equal(isValid, true);
  });

});


describe('ManifestJSONParser type', function() {

  it('should have the right type', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json);
    var isValid = manifestJSONParser.validate();
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.type, PACKAGE_EXTENSION);
    assert.equal(isValid, true);
  });

  it('should not allow the type to be user-specified', () => {
    var json = validManifestJSON({type: 'whatevs'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var isValid = manifestJSONParser.validate();
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.type, PACKAGE_EXTENSION);
    assert.equal(isValid, true);
  });

});


describe('ManifestJSONParser name', function() {

  it('should extract a name', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var json = validManifestJSON({name: 'my-awesome-ext'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var isValid = manifestJSONParser.validate();
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(metadata.name, 'my-awesome-ext');
    assert.equal(isValid, true);
  });

  it('should collect an error on missing name value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({name: undefined});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/name');
  });

  it('should collect an error on non-string name value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({name: 1});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/name');
  });

});

describe('ManifestJSONParser version', function() {

  it('should extract a version', () => {
    var json = validManifestJSON({version: '1.0'});
    var manifestJSONParser = new ManifestJSONParser(json);
    var isValid = manifestJSONParser.validate();
    var metadata = manifestJSONParser.getMetadata();
    assert.equal(isValid, true);
    assert.equal(metadata.version, '1.0');
  });

  it('should collect an error on missing version value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({version: undefined});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/version');
  });

  it('should collect an error on non-string version value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = validManifestJSON({version: 1});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonLinter.collector);
    var isValid = manifestJSONParser.validate();
    assert.equal(isValid, false);

    manifestJSONParser.getMetadata();
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, 'MANIFEST_JSON_INVALID');
    assert.include(errors[0].message, '/version');
  });

});
