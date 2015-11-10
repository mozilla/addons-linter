import ManifestJSONParser from 'parsers/manifestjson';
import Validator from 'validator';

import * as messages from 'messages';
import { PACKAGE_EXTENSION } from 'const';

import { validManifestJSON } from '../helpers';


describe('ManifestJSONParser.getMetaData()', function() {

  it('should collect an error on invalid type value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({manifest_version: 'whatever'});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.type, null);
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.TYPE_INVALID.code);
      });
  });

  it('should collect a notice if type is missing', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({manifest_version: undefined});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.type, null);
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.TYPE_MISSING.code);
      });
  });

  it('should have the right type', () => {
    var addonValidator = new Validator({_: ['bar']});
    var json = validManifestJSON({manifest_version: 2});
    var manifestJSONParser = new ManifestJSONParser(json,
                                                    addonValidator.collector);
    return manifestJSONParser.getMetaData()
      .then((metadata) => {
        assert.equal(metadata.type, PACKAGE_EXTENSION);
      });
  });

});
