import fs from 'fs';

import XMLDom from 'xmldom';

import { RDF_DEFAULT_NAMESPACE } from 'const';
import RDFScanner from 'scanners/rdf';
import * as rules from 'rules/rdf';
import { ignorePrivateFunctions } from 'utils';

import { getRuleFiles, validRDF } from '../helpers';


describe('RDF', () => {
  it('should report a proper scanner name', () => {
    expect(RDFScanner.scannerName).toEqual('rdf');
  });

  it('should not warn when we validate a good RDF file', () => {
    const contents = fs.readFileSync('tests/example.rdf', 'utf8');
    const rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should init with the default namespace and accept a new one', () => {
    const rdfScanner = new RDFScanner('', 'filename.txt');
    expect(rdfScanner.options.namespace).toEqual(RDF_DEFAULT_NAMESPACE);

    const namespace = 'https://tofumatt.name/coffee.xml#';
    const rdfScannerWithNewNS = new RDFScanner('', 'filename.txt', {
      namespace,
    });
    expect(rdfScannerWithNewNS.options.namespace).toEqual(namespace);
  });

  it('should handle unicode characters', () => {
    const contents = validRDF('<em:weLikeToParty>🎉</em:weLikeToParty>');
    const rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should return an already-parsed xmlDoc if exists', () => {
    sinon.spy(XMLDom, 'DOMParser');

    const contents = validRDF();
    const rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.getContents()
      .then(() => {
        return rdfScanner.getContents();
      })
      .then(() => {
        expect(XMLDom.DOMParser.calledOnce).toBeTruthy();
        XMLDom.DOMParser.restore();
      });
  });

  it('should blow up 💣  when handed malformed XML', () => {
    const contents = validRDF('<em:hidden>true/em:hidden>');
    const rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(() => {
        expect(false).toBe(true);
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('RDFParseError');
      });
  });

  it('should export and run all rules in rules/rdf', () => {
    const ruleFiles = getRuleFiles('rdf');
    const contents = validRDF();
    const rdfScanner = new RDFScanner(contents, 'install.rdf');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length);

    return rdfScanner.scan()
      .then(() => {
        expect(rdfScanner._rulesProcessed).toEqual(
          Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });
});
