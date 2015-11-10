import InstallRdfParser from 'parsers/installrdf';
import Validator from 'validator';

import * as messages from 'messages';
import * as constants from 'const';

import { unexpectedSuccess, validRDF } from '../helpers';


describe('InstallRdfParser.getMetaData()', function() {

  it('should reject on multiple em:type nodes', () => {
    var rdf = validRDF('<em:type>2</em:type><em:type>2</em:type>');
    var installRdfParser = new InstallRdfParser(rdf);
    return installRdfParser.getMetaData()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, 'Multiple <em:type> elements found');
      });
  });

  it('should collect an error on invalid type value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var rdf = validRDF('<em:type>whatevs</em:type>');
    var installRdfParser = new InstallRdfParser(rdf, addonValidator.collector);
    return installRdfParser.getMetaData()
      .then(() => {
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.TYPE_INVALID.code);
      });
  });

  it('should resolve with mapped type value', () => {
    var rdf = validRDF('<em:type>2</em:type>');
    var installRdfParser = new InstallRdfParser(rdf);
    return installRdfParser.getMetaData()
      .then((addonMetaData) => {
        // Type 2 maps to 1 PACKAGE_EXTENSION
        assert.equal(addonMetaData.type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should resolve with mapped type value for experiments', () => {
    var rdf = validRDF('<em:type>128</em:type>');
    var installRdfParser = new InstallRdfParser(rdf);
    return installRdfParser.getMetaData()
      .then((addonMetaData) => {
        // Type 128 (experiments) maps to 1 PACKAGE_EXTENSION
        assert.equal(addonMetaData.type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect a notice if type is missing', () => {
    var addonValidator = new Validator({_: ['bar']});
    var installRdfParser = new InstallRdfParser(validRDF(''),
                                                addonValidator.collector);
    return installRdfParser.getMetaData()
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.TYPE_MISSING.code);
      });
  });

});
