import fs from 'fs';

import sinon from 'sinon';
import XMLDom from 'xmldom';

import { RDFParseError } from 'exceptions';
import { validRDF } from '../helpers';
import RDFScanner from 'validators/rdf';


describe('RDF', function() {

  it('should not warn when we validate a good RDF file', () => {
    var contents = fs.readFileSync('tests/example.rdf', 'utf8');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should handle unicode characters', () => {
    var contents = validRDF('<em:weLikeToParty>🎉</em:weLikeToParty>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should run all rules in rules/html', () => {
    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      iAmAAnotherFakeRule: sinon.stub(),
    };

    return rdfScanner.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.ok(fakeRules.iAmAAnotherFakeRule.calledOnce);
      });
  });

  it('should return an already-parsed xmlDoc if exists', () => {
    sinon.spy(XMLDom, 'DOMParser');

    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.getXMLDoc()
      .then(() => {
        return rdfScanner.getXMLDoc();
      })
      .then(() => {
        assert.ok(XMLDom.DOMParser.calledOnce);
        XMLDom.DOMParser.restore();
      });
  });

  it('should run all rules in rules/rdf', () => {
    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      iAmAAnotherFakeRule: sinon.stub(),
    };

    return rdfScanner.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.ok(fakeRules.iAmAAnotherFakeRule.calledOnce);
      });
  });

  it('should not run private function inside rules', () => {
    var contents = validRDF();
    var rdfScanner = new RDFScanner(contents, 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      _iAmAPrivateFunction: sinon.stub(),
    };

    return rdfScanner.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.notOk(fakeRules._iAmAPrivateFunction.calledOnce);
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
        assert.instanceOf(err, RDFParseError);
      });
  });

});
