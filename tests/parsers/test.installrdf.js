import { INSTALL_RDF } from 'const';
import RDFScanner from 'scanners/rdf';
import InstallRdfParser from 'parsers/installrdf';
import Validator from 'validator';

import * as messages from 'messages';
import * as constants from 'const';

import { unexpectedSuccess, validRDF } from '../helpers';


describe('InstallRdfParser._getAddonType()', function() {

  it('should reject on multiple em:type nodes', () => {
    var rdf = validRDF('<em:type>2</em:type><em:type>2</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getAddonType();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, 'Multiple <em:type> elements found');
      });
  });

  it('should collect an error on invalid type value', () => {
    var addonValidator = new Validator({_: ['bar']});
    var rdf = validRDF('<em:type>whatevs</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonValidator.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.RDF_TYPE_INVALID.code);
      });
  });

  it('should resolve with mapped type value', () => {
    var rdf = validRDF('<em:type>2</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 2 maps to 1 PACKAGE_EXTENSION
        assert.equal(type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should resolve with mapped type value for experiments', () => {
    var rdf = validRDF('<em:type>128</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 128 (experiments) maps to 1 PACKAGE_EXTENSION
        assert.equal(type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect a notice if type is missing', () => {
    var addonValidator = new Validator({_: ['bar']});
    // Specifying a different tag e.g. not <em:type>.
    var rdf = validRDF('<em:name>whatevs</em:name>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonValidator.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.RDF_TYPE_MISSING.code);
      });
  });
});


describe('InstallRdfParser._getName()', function() {

  it('should extract a name', () => {
    var rdf = validRDF('<em:name>my-awesome-ext</em:name>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getName();
      })
      .then((name) => {
        assert.equal(name, 'my-awesome-ext');
      });
  });

  it('should collect a notice if name is missing', () => {
    var addonValidator = new Validator({_: ['bar']});
    var rdf = validRDF('<em:type>1</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonValidator.collector);
        return installRdfParser._getName();
      })
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.RDF_NAME_MISSING.code);
      });
  });
});

describe('InstallRdfParser._getGUID()', function() {

  it('should extract a guid', () => {
    var rdf = validRDF('<em:id>myid</em:id>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        assert.typeOf(guid, 'string');
        assert.equal(guid, 'myid');
      });
  });

  it('should return null for guid if not defined', () => {
    var rdf = validRDF('<em:type>1</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        assert.equal(guid, null);
      });
  });
});
