import { INSTALL_RDF } from 'const';
import RDFScanner from 'scanners/rdf';
import InstallRdfParser from 'parsers/installrdf';
import Linter from 'linter';

import * as messages from 'messages';
import * as constants from 'const';
import { singleLineString } from 'utils';

import { unexpectedSuccess, validRDF } from '../helpers';


describe('InstallRdfParser._getAddonType()', function() {

  it('should reject on multiple em:type nodes', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>2</em:type><em:type>2</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, 'Multiple <em:type> elements found');
      });
  });

  it('should collect an error on invalid type value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>whatevs</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        var errors = addonLinter.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.RDF_TYPE_INVALID.code);
      });
  });

  it('should resolve with mapped type value', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>2</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 2 maps to 1 PACKAGE_EXTENSION
        assert.equal(type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should resolve with mapped type value for experiments', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>128</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 128 (experiments) maps to 1 PACKAGE_EXTENSION
        assert.equal(type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect a notice if type is missing', () => {
    var addonLinter = new Linter({_: ['bar']});
    // Specifying a different tag e.g. not <em:type>.
    var rdf = validRDF('<em:name>whatevs</em:name>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        var notices = addonLinter.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.RDF_TYPE_MISSING.code);
      });
  });
});

describe('InstallRdfParser._getVersion()', function() {

  it('should extract a version', () => {
    var rdf = validRDF('<em:version>1.0</em:version>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getVersion();
      })
      .then((name) => {
        assert.equal(name, '1.0');
      });
  });

  it('should collect an error if version is missing', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:version></em:version>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getVersion();
      })
      .then(() => {
        var errors = addonLinter.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.RDF_VERSION_MISSING.code);
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

  it('should collect an error if name is missing', () => {
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>1</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getName();
      })
      .then(() => {
        var errors = addonLinter.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.RDF_NAME_MISSING.code);
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
    var addonLinter = new Linter({_: ['bar']});
    var rdf = validRDF('<em:type>1</em:type>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        assert.equal(guid, null);
      });
  });

  it('should return top-level em:id only', () => {
    var rdf = validRDF(`<em:id>hai</em:id><Description>
      <em:id>something</em:id></Description>`);
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        assert.equal(guid, 'hai');
      });
  });

  it('should collect an error if top-level GUID is too long', () => {
    var addonLinter = new Linter({_: ['bar']});
    var longGUID = 'a'.repeat(256);
    var rdf = validRDF(`<em:id>${longGUID}</em:id>`);
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc,
                                                    addonLinter.collector);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        var errors = addonLinter.collector.errors;
        assert.equal(guid, longGUID);
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.RDF_GUID_TOO_LONG.code);
      });
  });

});

describe('InstallRdfParser._getIsBootstrapped()', () => {
  it('should extract that the addon is restartless', () => {
    var rdf = validRDF('<em:bootstrap>true</em:bootstrap>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        assert.typeOf(bootstrap, 'boolean');
        assert.equal(bootstrap, true);
      });
  });

  it("should extract that the addon isn't restartless", () => {
    var rdf = validRDF('<em:bootstrap>false</em:bootstrap>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        assert.typeOf(bootstrap, 'boolean');
        assert.equal(bootstrap, false);
      });
  });

  it('should extract only the top level bootstrap value', () => {
    var rdf = validRDF(`<em:bootstrap>true</em:bootstrap><Description>
      <em:bootstrap>false</em:bootstrap></Description>`);
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        assert.typeOf(bootstrap, 'boolean');
        assert.equal(bootstrap, true);
      });
  });

  it("should assume that an addon isn't restartless", () => {
    var rdf = validRDF('<em:id>123</em:id>');
    var rdfScanner = new RDFScanner(rdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        assert.typeOf(bootstrap, 'boolean');
        assert.equal(bootstrap, false);
      });
  });
});

describe('InstallRdfParser._getDescriptionNode()', function() {

  it('should reject on missing RDF node', () => {
    var badRdf = singleLineString`<xml><RDF><Description>hai</Description>
      <Description>there</Description></RDF></xml>`;
    var rdfScanner = new RDFScanner(badRdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getDescriptionNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message,
          'RDF node should only have a single descendant <Description>');
      });
  });
});


describe('InstallRdfParser._getRDFNode()', function() {

  it('should reject on missing RDF node', () => {
    var badRdf = '<xml><wat>whatever</wat></xml>';
    var rdfScanner = new RDFScanner(badRdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getRDFNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, 'RDF Node is not defined');
      });
  });

  it('should reject on multiple RDF nodes', () => {
    var badRdf = '<xml><RDF>whatever</RDF><RDF>Something else</RDF></xml>';
    var rdfScanner = new RDFScanner(badRdf, INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        var installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getRDFNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, 'Multiple RDF tags found');
      });
  });

});
