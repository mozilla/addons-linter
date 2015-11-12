import ManifestJSONParser from 'parsers/manifestjson';
import Validator from 'validator';

import * as messages from 'messages';
import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';

import { validManifestJSON } from '../helpers';


describe('ManifestJSONParser.getMetaData()', function() {

  it('should collect an error on invalid manifest_version value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({manifest_version: 'whatever'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.manifestVersion, null);
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.MANIFEST_VERSION_INVALID.code);
      });
  });

  it('should have the right manifestVersion', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.manifestVersion, VALID_MANIFEST_VERSION);
      });
  });

  it('should have the right type', () => {
    // Type is always returned as PACKAGE_EXTENSION presently.
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON();
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.type, PACKAGE_EXTENSION);
      });
  });

});
