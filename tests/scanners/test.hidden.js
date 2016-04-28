import HiddenScanner from 'scanners/hidden';
import {HIDDEN_FILE_SCANNER_REGEX} from 'const';

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

describe('Hidden regexes', function() {

  it('should find the right files', () => {
    // Because regexes never go wrong, some sanity checks.
    assert.isOk('__MACOSX/foo.txt'.match(HIDDEN_FILE_SCANNER_REGEX));
    assert.isNotOk('__MACOSXfoo.txt'.match(HIDDEN_FILE_SCANNER_REGEX));
    assert.isNotOk('foo/__MACOSX'.match(HIDDEN_FILE_SCANNER_REGEX));
    assert.isOk('foo/Thumbs.db'.match(HIDDEN_FILE_SCANNER_REGEX));
    assert.isOk('foo/thumbs.db'.match(HIDDEN_FILE_SCANNER_REGEX));
    assert.isNotOk('Thumbs.db/foo'.match(HIDDEN_FILE_SCANNER_REGEX));
  });

});
