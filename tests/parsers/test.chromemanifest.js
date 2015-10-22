import ChromeManifestParser from 'parsers/chromemanifest';
import { validChromeManifest } from '../helpers';

describe('chrome.manifest parser', () => {

  var manifest;

  beforeEach(() => {
    manifest = validChromeManifest([
      '# I am a comment',
      'skin  global  classic/1.0 jar:classic.jar!/skin/classic/',
      'locale  necko  en-US  jar:en-US.jar!/locale/en-US/necko/',
      'content   pippki   jar:pippki.jar!/content/pippki/',
    ]);
  });

  it('should parse simple triples', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples[0].subject, 'content');
        assert.equal(triples[1].subject, 'skin');
        assert.equal(triples[2].subject, 'locale');

        assert.equal(triples[0].predicate, 'necko');
        assert.equal(triples[1].predicate, 'global');
        assert.equal(triples[2].predicate, 'necko');

        assert.include(triples[0].object, 'jar:comm.jar');
        assert.include(triples[1].object, 'classic/1.0');
        assert.include(triples[2].object, 'en-US');
      });
  });

  it('should allow for filtering by subject', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.filterTriples({subject: 'content'})
      .then((triples) => {
        assert.equal(triples.length, 2);
        assert.equal(triples[0].predicate, 'necko');
        assert.equal(triples[1].predicate, 'pippki');
      });
  });

  it('should allow for filtering by predicate', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.filterTriples({predicate: 'necko'})
      .then((triples) => {
        assert.equal(triples.length, 2);
        assert.equal(triples[0].subject, 'content');
        assert.equal(triples[1].subject, 'locale');
      });
  });

  it('should allow for filtering by predicate', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.filterTriples({object: 'jar:pippki.jar!/content/pippki/'})
      .then((triples) => {
        assert.equal(triples.length, 1);
        assert.equal(triples[0].subject, 'content');
      });
  });

  it('should return cached triples from instance', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    var triples = [{subject: 'foo', predicate: 'bar', object: 'baz'}];
    cmParser.triples = triples;
    return cmParser.parse()
      .then((cachedTriples) => {
        assert.deepEqual(cachedTriples, triples);
      });
  });

  it('should not capture comments', () => {
    var manifest = validChromeManifest(['# I am a comment'], {
      includeBoilerplate: false});

    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples.length, 0);
      });
  });

  it('should not capture triples without all parts', () => {
    var manifest = validChromeManifest(['foo'], {
      includeBoilerplate: false});

    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples.length, 0);
      });
  });

  it('should have line number', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples[0].line, 1);
        // There's a comment in line 2.
        assert.equal(triples[1].line, 3);
      });
  });

  it('should have filename', () => {
    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples[0].filename, 'chrome.manifest');
      });
  });

  it('should add object with empty string if only 2 parts to triple', () => {
    var manifest = validChromeManifest(['foo bar'], {
      includeBoilerplate: false});

    var cmParser = new ChromeManifestParser(manifest, 'chrome.manifest');
    return cmParser.parse()
      .then((triples) => {
        assert.equal(triples.length, 1);
        assert.equal(triples[0].subject, 'foo');
        assert.equal(triples[0].predicate, 'bar');
        assert.equal(triples[0].object, '');
      });
  });

});
