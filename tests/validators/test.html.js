import cheerio from 'cheerio';
import sinon from 'sinon';

import { VALIDATION_ERROR } from 'const';
import { validHTML } from '../helpers';
import HTMLScanner from 'validators/html';
import * as rules from 'rules/html';
import * as messages from 'messages';
import { singleLineString } from 'utils';


describe('HTML', function() {

  it('should not warn when we validate a good HTML file', () => {
    var contents = validHTML();
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should handle unicode characters', () => {
    var contents = validHTML('<strong>🎉</strong>');
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should require <prefwindow> tag to have an id attribute', () => {
    var badHTML = validHTML(singleLineString`<prefwindow
      xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
      title="My application: configuration"
      onunload="onUnload(event.target)">
    </prefwindow>`);
    var goodHTML = validHTML(singleLineString`<prefwindow
      xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
      id="my-config-dialog"
      title="My application: configuration"
      onunload="onUnload(event.target)">
    </prefwindow>`);
    var htmlScanner = new HTMLScanner(badHTML, 'index.html');

    return htmlScanner.getContents()
      .then(($) => {
        return rules.ensureRequiredAttributes($, htmlScanner.filename);
      })
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 1);
        assert.equal(validatorMessages[0].code,
                     messages.PREFWINDOW_REQUIRES_ID.code);
        assert.equal(validatorMessages[0].sourceCode, '<prefwindow>');
        assert.equal(validatorMessages[0].type, VALIDATION_ERROR);

        // Make sure there are no errors when an ID is provided.
        htmlScanner = new HTMLScanner(goodHTML, 'index.html');
        return htmlScanner.getContents();
      })
      .then(($) => {
        return rules.ensureRequiredAttributes($, htmlScanner.filename);
      })
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should not blow up when handed malformed HTML', () => {
    var html = validHTML('<div>Howdy <!-- >');
    var htmlScanner = new HTMLScanner(html, 'index.html');

    return htmlScanner.scan();
  });

  it('should return an already-parsed htmlDoc if exists', () => {
    var contents = validHTML();
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    sinon.spy(cheerio, 'load');

    return htmlScanner.getContents()
      .then(() => {
        return htmlScanner.getContents();
      })
      .then(() => {
        assert.ok(cheerio.load.calledOnce);
      });
  });

});
