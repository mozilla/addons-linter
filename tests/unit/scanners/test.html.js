import * as cheerio from 'cheerio';
import { oneLine } from 'common-tags';

import { VALIDATION_WARNING } from 'const';
import HTMLScanner from 'scanners/html';
import * as rules from 'rules/html';
import * as messages from 'messages';
import { ignorePrivateFunctions } from 'utils';

import { getRuleFiles, validHTML } from '../helpers';

describe('HTML', () => {
  it('should report a proper scanner name', () => {
    expect(HTMLScanner.scannerName).toEqual('html');
  });

  it('should not warn when we validate a good HTML file', async () => {
    const contents = validHTML();
    const htmlScanner = new HTMLScanner(contents, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should handle unicode characters', async () => {
    const contents = validHTML('<strong>🎉</strong>');
    const htmlScanner = new HTMLScanner(contents, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should warn on <script> tag without a src attribute and without type attribute', async () => {
    const badHTML = validHTML('<script>alert()</script>');
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.INLINE_SCRIPT.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should warn on <script> tag without a src attribute but a type attribute whose value is "text/javascript"', async () => {
    const badHTML = validHTML(
      '<script type="text/javascript">alert()</script>'
    );
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.INLINE_SCRIPT.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should accept a <script> tag without a src attribute but a type attribute whose value is not "text/javascript"', async () => {
    const goodHTML = validHTML(oneLine`
        <script type="text/html" id="my-html-template-used-in-knockout">`);
    const htmlScanner = new HTMLScanner(goodHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should accept a <script> tag with a src attribute', async () => {
    const goodHTML = validHTML(oneLine`
        <script src="">alert()</script>`);
    const htmlScanner = new HTMLScanner(goodHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should warn on remote <script> tag src attribute', async () => {
    const badHTML = validHTML(oneLine`
      <script src="http://foo.bar/my.js"></script>
      <script src="https://foo.bar/my.js"></script>
      <script src="file://foo.bar/my.js"></script>
      <script src="ftp://foo.bar/my.js"></script>
      <script src="moz-extension://foo/my.js"></script>
      <script src="//foo.bar/my.js"></script>
    `);
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(6);

    linterMessages.forEach((message) => {
      expect(message.code).toEqual(messages.REMOTE_SCRIPT.code);
      expect(message.type).toEqual(VALIDATION_WARNING);
    });
  });

  it('should allow <script> src attribute to be local', async () => {
    const badHTML = validHTML(oneLine`
      <script src="./bar/my.js"></script>
      <script src="/foo/my.js"></script>
      <script src="foo/my.js"></script>
    `);
    const htmlScanner = new HTMLScanner(badHTML, 'index.html');

    const { linterMessages } = await htmlScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should not blow up when handed malformed HTML', () => {
    const html = validHTML('<div>Howdy <!-- >');
    const htmlScanner = new HTMLScanner(html, 'index.html');

    expect(async () => {
      await htmlScanner.scan();
    }).not.toThrow();
  });

  it('should return an already-parsed htmlDoc if exists', async () => {
    const contents = validHTML();
    const loadHTML = sinon.spy(cheerio.load);
    const htmlScanner = new HTMLScanner(contents, 'index.html', {
      loadHTML,
    });

    const c1 = await htmlScanner.getContents();
    const c2 = await htmlScanner.getContents();

    sinon.assert.calledOnce(loadHTML);
    expect(c1).toEqual(c2);
  });

  it('should export and run all rules in rules/html', async () => {
    const ruleFiles = getRuleFiles('html');
    const contents = validHTML();
    const htmlScanner = new HTMLScanner(contents, 'index.html');

    expect(ruleFiles.length).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length
    );

    await htmlScanner.scan();
    expect(htmlScanner._rulesProcessed).toEqual(
      Object.keys(ignorePrivateFunctions(rules)).length
    );
  });
});
