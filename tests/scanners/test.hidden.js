import HiddenScanner from 'scanners/hidden';
import { FLAGGED_FILE_REGEX, HIDDEN_FILE_REGEX } from 'const';

describe('HiddenScanner', function() {

  it('should warn when finding a hidden file', () => {
    var hiddenScanner = new HiddenScanner('', '__MACOSX/foo.txt');

    return hiddenScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code, 'HIDDEN_FILE');
        assert.equal(linterMessages[0].file, '__MACOSX/foo.txt');
      });
  });

  it('should warn when finding a flagged file', () => {
    var hiddenScanner = new HiddenScanner('', 'Thumbs.db');

    return hiddenScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code, 'FLAGGED_FILE');
        assert.equal(linterMessages[0].file, 'Thumbs.db');
      });
  });

  it('should error out when it fails the regexes', () => {
    var hiddenScanner = new HiddenScanner('', 'wat.txt');

    return hiddenScanner.scan()
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'wat.txt');
      });
  });

});

describe('Hidden and Flagged File Regexes', function() {

  const matchingHiddenFiles = [
    '__MACOSX/foo.txt',
    '__MACOSX/.DS_Store',
  ];

  for (const filePath of matchingHiddenFiles) {
    it(`should match ${filePath} as a hidden file`, () => {
      assert.isOk(filePath.match(HIDDEN_FILE_REGEX),
        `${filePath} should match hidden file regex`);
    });
  }

  const nonMatchingHiddenFiles = [
    '__MACOSXfoo.txt',
    'foo/__MACOSX',
  ];

  for (const filePath of nonMatchingHiddenFiles) {
    it(`should not match ${filePath} as a hidden file`, () => {
      assert.isNotOk(filePath.match(HIDDEN_FILE_REGEX),
        `${filePath} should not match hidden file regex`);
    });
  }

  const matchingFlaggedFiles = [
    'foo/Thumbs.db',
    'foo/thumbs.db',
    'whatever/something.orig',
    'whatever/OLD.old',
    'whatever/.DS_STORE',
    'whatever/.DS_Store',
    'something~',
  ];

  for (const filePath of matchingFlaggedFiles) {
    it(`should match ${filePath} as a flagged file`, () => {
      assert.isOk(filePath.match(FLAGGED_FILE_REGEX),
        `${filePath} should match flagged file regex`);
    });
  }

  const nonMatchingFlaggedFiles = [
    'Thumbs.db/foo',
    'whatever.orig/something',
    'whatever.old/something',
  ];

  for (const filePath of nonMatchingFlaggedFiles) {
    it(`should not match ${filePath} as a flagged file`, () => {
      assert.isNotOk(filePath.match(FLAGGED_FILE_REGEX),
        `${filePath} should not match flagged file regex`);
    });
  }
});
