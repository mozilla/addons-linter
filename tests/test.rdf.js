import fs from 'fs';

import { VALIDATION_ERROR, VALIDATION_NOTICE, VALIDATION_WARNING } from 'const';
import { RDFParseError } from 'exceptions';
import RDFScanner from 'validators/rdf';
import * as messages from 'messages';
import { singleLineString } from 'utils';


function validRDF(contents) {
  return singleLineString`<?xml version='1.0' encoding='utf-8'?>
  <RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
       xmlns:em="http://www.mozilla.org/2004/em-rdf#">
    <Description about="urn:mozilla:install-manifest">
      ${contents}
    </Description>
  </RDF>`;
}

describe('RDF Checker', function() {

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

  it('should not allow <hidden> tag', () => {
    var contents = validRDF('<em:hidden>true</em:hidden>');
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.mustNotExist()
      .then(() => {
        var validatorMessages = rdfScanner.validatorMessages;

        assert.equal(validatorMessages.length, 1);
        assert.equal(validatorMessages[0].code,
                     messages.TAG_NOT_ALLOWED_HIDDEN.code);
        assert.equal(validatorMessages[0].severity, VALIDATION_ERROR);
      });
  });

  it('should not fail when multiple bad tags are found', () => {
    var contents = validRDF(singleLineString`<em:hidden>true</em:hidden>
      <em:hidden>false</em:hidden>`);
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.mustNotExist()
      .then(() => {
        var validatorMessages = rdfScanner.validatorMessages;

        assert.equal(validatorMessages.length, 2);
        for (let message of validatorMessages) {
          assert.equal(message.code, messages.TAG_NOT_ALLOWED_HIDDEN.code);
          assert.equal(message.severity, VALIDATION_ERROR);
        }
      });
  });

  it('should test for obsolete tags', () => {
    var contents = validRDF(singleLineString`<em:file>'foo.js'</em:file>
      <em:requires>'something'</em:requires><em:skin>true</em:skin>`);
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.mustNotExist()
      .then(() => {
        var validatorMessages = rdfScanner.validatorMessages;

        assert.equal(validatorMessages.length, 3);

        for (let message of validatorMessages) {
          assert.equal(message.severity, VALIDATION_WARNING);
        }

        assert.equal(validatorMessages[0].code,
                     messages.TAG_OBSOLETE_FILE.code);
        assert.equal(validatorMessages[1].code,
                     messages.TAG_OBSOLETE_REQUIRES.code);
        assert.equal(validatorMessages[2].code,
                     messages.TAG_OBSOLETE_SKIN.code);
      });
  });

  it('should blow up 💣 when handed malformed XML', () => {
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

  it('_checkForTags should find tags and set the correct severity', () => {
    var contents = validRDF(singleLineString`<em:nameTag>Matthew Riley
      MacPherson</em:nameTag><em:file>'foo.js'</em:file>`);
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner
      ._checkForTags(['file'], VALIDATION_NOTICE, 'TAG_OBSOLETE_')
      .then(() => {
        var validatorMessages = rdfScanner.validatorMessages;

        assert.equal(validatorMessages.length, 1);
        assert.equal(validatorMessages[0].code,
                     messages.TAG_OBSOLETE_FILE.code);
        assert.equal(validatorMessages[0].severity, VALIDATION_NOTICE);
      });
  });
});
