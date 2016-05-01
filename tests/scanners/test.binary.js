import BinaryScanner from 'scanners/binary';
import { FLAGGED_FILE_MAGIC_NUMBERS } from 'const';

describe('Binary', function() {

  it('should do nothing on a text file', () => {
    var buffer = new Buffer('wat');
    var scanner = new BinaryScanner(buffer, 'wat.txt');

    return scanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 0);
      });
  });

  it('should notice a flagged file', () => {
    for (let magic of FLAGGED_FILE_MAGIC_NUMBERS) {
      console.log(magic);
      var buffer = new Buffer(magic);
      var scanner = new BinaryScanner(buffer, 'wat.txt');

      return scanner.scan()
        .then((linterMessages) => {
          assert.equal(linterMessages.length, 1);
          assert.equal(linterMessages[0].code, 'FLAGGED_FILE_TYPE');
          assert.equal(linterMessages[0].file, 'wat.txt');
        });
    }
  });

  it('should ask for a chunk', () => {
    assert.equal(BinaryScanner.fileStreamType, 'chunk');
  });

});
