import fs from 'fs';

import sinon from 'sinon';
import XMLDom from 'xmldom';

import { RDF_DEFAULT_NAMESPACE } from 'const';
import { getRuleFiles, validRDF } from '../helpers';
import RDFScanner from 'scanners/rdf';
import * as rules from 'rules/rdf';
import { ignorePrivateFunctions } from 'utils';


describe('RDF', function() {

  it('should report a proper scanner name', () => {
    expect(RDFScanner.scannerName).toEqual('rdf');
  });

  it('should not warn when we validate a good RDF file', () => {
    var contents = fs.readFileSync('tests/example.rdf', 'utf8');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should init with the default namespace and accept a new one', () => {
    var rdfScanner = new RDFScanner('', 'filename.txt');
    expect(rdfScanner.options.namespace).toEqual(RDF_DEFAULT_NAMESPACE);

    var namespace = 'https://tofumatt.name/coffee.xml#';
    var rdfScannerWithNewNS = new RDFScanner('', 'filename.txt', {
      namespace: namespace,
    });
    expect(rdfScannerWithNewNS.options.namespace).toEqual(namespace);
  });

  it('should handle unicode characters', () => {
    var contents = validRDF('<em:weLikeToParty>🎉</em:weLikeToParty>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should return an already-parsed xmlDoc if exists', () => {
    sinon.spy(XMLDom, 'DOMParser');

    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

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
    var contents = validRDF('<em:hidden>true/em:hidden>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

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
    var ruleFiles = getRuleFiles('rdf');
    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length);

    return rdfScanner.scan()
      .then(() => {
        expect(rdfScanner._rulesProcessed).toEqual(
          Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

});
