import { VALIDATION_ERROR, VALIDATION_NOTICE, VALIDATION_WARNING } from 'const';
import * as rules from 'rules/rdf';
import RDFScanner from 'scanners/rdf';
import * as messages from 'messages';
import { singleLineString } from 'utils';
import { validRDF } from '../helpers';


describe('RDF: mustNotExist', () => {
  var filename = 'install.rdf';

  it('should not allow <hidden> tag', () => {
    var contents = validRDF('<em:hidden>true</em:hidden>');
    var rdfScanner = new RDFScanner(contents, filename);

    return rdfScanner.getContents()
      .then((xmlDoc) => {
        return rules.mustNotExist(xmlDoc, filename,
                                  rdfScanner.options);
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code,
                     messages.TAG_NOT_ALLOWED_HIDDEN.code);
        assert.equal(linterMessages[0].type, VALIDATION_ERROR);
      });
  });

  it('should not blow up when multiple bad tags are found', () => {
    var contents = validRDF(singleLineString`<em:hidden>true</em:hidden>
      <em:hidden>false</em:hidden>`);
    var rdfScanner = new RDFScanner(contents, filename);

    return rdfScanner.getContents()
      .then((xmlDoc) => {
        return rules.mustNotExist(xmlDoc, filename,
                                 rdfScanner.options);
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 2);

        for (let message of linterMessages) {
          assert.equal(message.code, messages.TAG_NOT_ALLOWED_HIDDEN.code);
          assert.equal(message.type, VALIDATION_ERROR);
        }
      });
  });

  it('should not allow certain tags contextually (eg. when listed)', () => {
    // Should fail because Add-on is listed and has an updateURL.
    var contents = validRDF(singleLineString`<em:listed>true</em:listed>
      <em:updateURL>http://mozilla.com/updateMyAddon.php</em:updateURL>`);
    var rdfScanner = new RDFScanner(contents, filename);

    return rdfScanner.getContents()
      .then((xmlDoc) => {
        return rules.mustNotExist(xmlDoc, filename,
                                 rdfScanner.options);
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        for (let message of linterMessages) {
          assert.equal(message.code, messages.TAG_NOT_ALLOWED_UPDATEURL.code);
          assert.equal(message.type, VALIDATION_ERROR);
        }

        // This shouldn't fail because there is no listed tag.
        contents = validRDF(singleLineString`
          <em:updateURL>http://mozilla.com/updateMyAddon.php</em:updateURL>`);
        rdfScanner = new RDFScanner(contents, filename);

        return rdfScanner.getContents();
      })
      .then((xmlDoc) => {
        return rules.mustNotExist(xmlDoc, filename,
                                 rdfScanner.options);
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 0);
      });
  });

  it('should test for obsolete tags', () => {
    var contents = validRDF(singleLineString`<em:file>'foo.js'</em:file>
      <em:requires>'something'</em:requires><em:skin>true</em:skin>`);
    var rdfScanner = new RDFScanner(contents, filename);

    return rdfScanner.getContents()
      .then((xmlDoc) => {
        return rules.mustNotExist(xmlDoc, filename,
                                 rdfScanner.options);
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 3);

        for (let message of linterMessages) {
          assert.equal(message.type, VALIDATION_WARNING);
        }

        assert.equal(linterMessages[0].code,
                     messages.TAG_OBSOLETE_FILE.code);
        assert.equal(linterMessages[1].code,
                     messages.TAG_OBSOLETE_REQUIRES.code);
        assert.equal(linterMessages[2].code,
                     messages.TAG_OBSOLETE_SKIN.code);
      });
  });

  it('_checkForTags should find tags and set the correct type', () => {
    var contents = validRDF(singleLineString`<em:nameTag>Matthew Riley
      MacPherson</em:nameTag><em:file>'foo.js'</em:file>`);
    var rdfScanner = new RDFScanner(contents, 'install.rdf');

    return rdfScanner.getContents()
      .then((xmlDoc) => {
        return rules._checkForTags({
          xmlDoc: xmlDoc,
          namespace: rdfScanner.options.namespace,
          tags: ['file'],
          type: VALIDATION_NOTICE,
          prefix: 'TAG_OBSOLETE_',
        });
      })
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code,
                     messages.TAG_OBSOLETE_FILE.code);
        assert.equal(linterMessages[0].type, VALIDATION_NOTICE);
      });
  });
});
