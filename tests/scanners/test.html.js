import cheerio from 'cheerio';

import { VALIDATION_WARNING } from 'const';
import { oneLine } from 'common-tags';
import HTMLScanner from 'scanners/html';
import * as rules from 'rules/html';
import * as messages from 'messages';
import { ignorePrivateFunctions } from 'utils';

import { getRuleFiles, validHTML } from '../helpers';


describe('HTML', () => {
  it('should report a proper scanner name', () => {
    expect(HTMLScanner.scannerName).toEqual('html');
  });

  it('should not warn when we validate a good HTML file', () => {
    const contents = validHTML();
    const htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should handle unicode characters', () => {
    const contents = validHTML('<strong>🎉</strong>');
    const htmlScanner = new HTMLScanner(contents, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should require <script> tag to have a src attribute', () => {
    const badHTML = validHTML('<script>alert()</script>');
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.INLINE_SCRIPT.code);
        expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
      });
  });

  it('should accept a <script> tag with a src attribute', () => {
    const goodHTML = validHTML(oneLine`
        <script src="">alert()</script>`);
    const htmlScanner = new HTMLScanner(goodHTML, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should warn on remote <script> tag src attribute', () => {
    const badHTML = validHTML(oneLine`
      <script src="http://foo.bar/my.js"></script>
      <script src="https://foo.bar/my.js"></script>
      <script src="file://foo.bar/my.js"></script>
      <script src="ftp://foo.bar/my.js"></script>
      <script src="moz-extension://foo/my.js"></script>
      <script src="//foo.bar/my.js"></script>
    `);
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(6);

        linterMessages.forEach((message) => {
          expect(message.code).toEqual(messages.REMOTE_SCRIPT.code);
          expect(message.type).toEqual(VALIDATION_WARNING);
        });
      });
  });

  it('should allow <script> src attribute to be local', () => {
    const badHTML = validHTML(oneLine`
      <script src="./bar/my.js"></script>
      <script src="/foo/my.js"></script>
      <script src="foo/my.js"></script>
    `);
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    return htmlScanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not blow up when handed malformed HTML', () => {
    const html = validHTML('<div>Howdy <!-- >');
    const htmlScanner = new HTMLScanner(html, 'index.html');

    return htmlScanner.scan();
  });

  it('should return an already-parsed htmlDoc if exists', () => {
    const contents = validHTML();
    const htmlScanner = new HTMLScanner(contents, 'index.html');

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
    const ruleFiles = getRuleFiles('html');
    const contents = validHTML();
    const htmlScanner = new HTMLScanner(contents, 'index.html');

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
