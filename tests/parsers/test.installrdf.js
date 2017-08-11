import * as constants from 'const';
import RDFScanner from 'scanners/rdf';
import InstallRdfParser from 'parsers/installrdf';
import Linter from 'linter';
import * as messages from 'messages';
import { singleLineString } from 'utils';

import { unexpectedSuccess, validRDF } from '../helpers';


describe('InstallRdfParser._getAddonType()', () => {
  it('should reject on multiple em:type nodes', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>2</em:type><em:type>2</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toEqual('Multiple <em:type> elements found');
      });
  });

  it('should collect an error on invalid type value', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>whatevs</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        const errors = addonLinter.collector.errors;
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.RDF_TYPE_INVALID.code);
      });
  });

  it('should resolve with mapped type value', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>2</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 2 maps to 1 PACKAGE_EXTENSION
        expect(type).toEqual(constants.PACKAGE_EXTENSION);
      });
  });

  it('should resolve with mapped type value for experiments', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>128</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then((type) => {
        // Type 128 (experiments) maps to 1 PACKAGE_EXTENSION
        expect(type).toEqual(constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect a notice if type is missing', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    // Specifying a different tag e.g. not <em:type>.
    const rdf = validRDF('<em:name>whatevs</em:name>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getAddonType();
      })
      .then(() => {
        const notices = addonLinter.collector.notices;
        expect(notices.length).toEqual(1);
        expect(notices[0].code).toEqual(messages.RDF_TYPE_MISSING.code);
      });
  });
});

describe('InstallRdfParser._getVersion()', () => {
  it('should extract a version', () => {
    const rdf = validRDF('<em:version>1.0</em:version>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getVersion();
      })
      .then((name) => {
        expect(name).toEqual('1.0');
      });
  });

  it('should collect an error if version is missing', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:version></em:version>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getVersion();
      })
      .then(() => {
        const errors = addonLinter.collector.errors;
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.RDF_VERSION_MISSING.code);
      });
  });
});

describe('InstallRdfParser._getName()', () => {
  it('should extract a name', () => {
    const rdf = validRDF('<em:name>my-awesome-ext</em:name>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getName();
      })
      .then((name) => {
        expect(name).toEqual('my-awesome-ext');
      });
  });

  it('should collect an error if name is missing', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>1</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getName();
      })
      .then(() => {
        const errors = addonLinter.collector.errors;
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.RDF_NAME_MISSING.code);
      });
  });
});

describe('InstallRdfParser._getGUID()', () => {
  it('should extract a guid', () => {
    const rdf = validRDF('<em:id>myid</em:id>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        expect(typeof guid).toBe('string');
        expect(guid).toEqual('myid');
      });
  });

  it('should return null for guid if not defined', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const rdf = validRDF('<em:type>1</em:type>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        expect(guid).toEqual(null);
      });
  });

  it('should return top-level em:id only', () => {
    const rdf = validRDF(`<em:id>hai</em:id><Description>
      <em:id>something</em:id></Description>`);
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        expect(guid).toEqual('hai');
      });
  });

  it('should collect an error if top-level GUID is too long', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const longGUID = 'a'.repeat(256);
    const rdf = validRDF(`<em:id>${longGUID}</em:id>`);
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc,
          addonLinter.collector);
        return installRdfParser._getGUID();
      })
      .then((guid) => {
        const errors = addonLinter.collector.errors;
        expect(guid).toEqual(longGUID);
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.RDF_GUID_TOO_LONG.code);
      });
  });
});

describe('InstallRdfParser._getIsBootstrapped()', () => {
  it('should extract that the addon is restartless', () => {
    const rdf = validRDF('<em:bootstrap>true</em:bootstrap>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        expect(typeof bootstrap).toBe('boolean');
        expect(bootstrap).toEqual(true);
      });
  });

  it("should extract that the addon isn't restartless", () => {
    const rdf = validRDF('<em:bootstrap>false</em:bootstrap>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        expect(typeof bootstrap).toBe('boolean');
        expect(bootstrap).toEqual(false);
      });
  });

  it('should extract only the top level bootstrap value', () => {
    const rdf = validRDF(`<em:bootstrap>true</em:bootstrap><Description>
      <em:bootstrap>false</em:bootstrap></Description>`);
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        expect(typeof bootstrap).toBe('boolean');
        expect(bootstrap).toEqual(true);
      });
  });

  it("should assume that an addon isn't restartless", () => {
    const rdf = validRDF('<em:id>123</em:id>');
    const rdfScanner = new RDFScanner(rdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getIsBootstrapped();
      })
      .then((bootstrap) => {
        expect(typeof bootstrap).toBe('boolean');
        expect(bootstrap).toEqual(false);
      });
  });
});

describe('InstallRdfParser._getDescriptionNode()', () => {
  it('should reject on missing RDF node', () => {
    const badRdf = singleLineString`<xml><RDF><Description>hai</Description>
      <Description>there</Description></RDF></xml>`;
    const rdfScanner = new RDFScanner(badRdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getDescriptionNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toEqual(
          'RDF node should only have a single descendant <Description>'
        );
      });
  });
});


describe('InstallRdfParser._getRDFNode()', () => {
  it('should reject on missing RDF node', () => {
    const badRdf = '<xml><wat>whatever</wat></xml>';
    const rdfScanner = new RDFScanner(badRdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getRDFNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toEqual('RDF Node is not defined');
      });
  });

  it('should reject on multiple RDF nodes', () => {
    const badRdf = '<xml><RDF>whatever</RDF><RDF>Something else</RDF></xml>';
    const rdfScanner = new RDFScanner(badRdf, constants.INSTALL_RDF);
    return rdfScanner.getContents()
      .then((xmlDoc) => {
        const installRdfParser = new InstallRdfParser(xmlDoc);
        return installRdfParser._getRDFNode();
      })
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toEqual('Multiple RDF tags found');
      });
  });
});
