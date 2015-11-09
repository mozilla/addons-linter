import fs from 'fs';

import sinon from 'sinon';
import XMLDom from 'xmldom';

import { RDF_DEFAULT_NAMESPACE } from 'const';
import { getRuleFiles, validRDF } from '../helpers';
import RDFScanner from 'scanners/rdf';
import * as rules from 'rules/rdf';
import { ignorePrivateFunctions } from 'utils';


describe('RDF', function() {

  it('should not warn when we validate a good RDF file', () => {
    var contents = fs.readFileSync('tests/example.rdf', 'utf8');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 0);
      });
  });

  it('should init with the default namespace and accept a new one', () => {
    var rdfScanner = new RDFScanner('', 'filename.txt');
    assert.equal(rdfScanner.options.namespace, RDF_DEFAULT_NAMESPACE);

    var namespace = 'https://tofumatt.name/coffee.xml#';
    var rdfScannerWithNewNS = new RDFScanner('', 'filename.txt', {
      namespace: namespace,
    });
    assert.equal(rdfScannerWithNewNS.options.namespace, namespace);
  });

  it('should handle unicode characters', () => {
    var contents = validRDF('<em:weLikeToParty>🎉</em:weLikeToParty>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 0);
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
        assert.ok(XMLDom.DOMParser.calledOnce);
        XMLDom.DOMParser.restore();
      });
  });

  it('should blow up 💣  when handed malformed XML', () => {
    var contents = validRDF('<em:hidden>true/em:hidden>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'RDFParseError');
      });
  });

  it('should export and run all rules in rules/rdf', () => {
    var ruleFiles = getRuleFiles('rdf');
    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    assert.equal(ruleFiles.length,
                 Object.keys(ignorePrivateFunctions(rules)).length);

    return rdfScanner.scan()
      .then(() => {
        assert.equal(rdfScanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

});
