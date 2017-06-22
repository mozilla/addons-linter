import cheerio from 'cheerio';

import { VALIDATION_WARNING } from 'const';
import { getRuleFiles, validHTML } from '../helpers';
import HTMLScanner from 'scanners/html';
import * as rules from 'rules/html';
import * as messages from 'messages';
import { ignorePrivateFunctions, singleLineString } from 'utils';


describe('HTML', function() {

  it('should report a proper scanner name', () => {
    expect(HTMLScanner.scannerName).toEqual('html');
  });

  it('should not warn when we validate a good HTML file', () => {
    var contents = validHTML();
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should handle unicode characters', () => {
    var contents = validHTML('<strong>🎉</strong>');
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should require <script> tag to have a src attribute', () => {
    var badHTML = validHTML('<script>alert()</script>');
    var htmlScanner = new HTMLScanner(badHTML, 'index.html');

    return htmlScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.INLINE_SCRIPT.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should accept a <script> tag with a src attribute', () => {
    var goodHTML = validHTML(singleLineString`
        <script src="">alert()</script>`);
    var htmlScanner = new HTMLScanner(goodHTML, 'index.html');

    return htmlScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(0);
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
        expect(cheerio.load.calledOnce).toBeTruthy();
      });
  });

  it('should export and run all rules in rules/html', () => {
    var ruleFiles = getRuleFiles('html');
    var contents = validHTML();
    var htmlScanner = new HTMLScanner(contents, 'index.html');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length
    );

    return htmlScanner.scan()
      .then(() => {
        expect(htmlScanner._rulesProcessed).toEqual(
          Object.keys(ignorePrivateFunctions(rules)).length
        );
      });
  });

});
