import BinaryScanner from 'scanners/binary';
import { FLAGGED_FILE_MAGIC_NUMBERS } from 'const';
import * as messages from 'messages';

describe('Binary', () => {
  it('should do nothing on a text file', () => {
    const buffer = new Buffer('wat');
    const scanner = new BinaryScanner(buffer, 'wat.txt');

    return scanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should notice a flagged file', () => {
    FLAGGED_FILE_MAGIC_NUMBERS.forEach((magic) => {
      const buffer = new Buffer(magic);
      const scanner = new BinaryScanner(buffer, 'wat.txt');

      return scanner.scan()
        .then(({ linterMessages }) => {
          expect(linterMessages.length).toEqual(1);
          expect(linterMessages[0].code).toEqual(
            messages.FLAGGED_FILE_TYPE.code
          );
          expect(linterMessages[0].file).toEqual('wat.txt');
        });
    });
  });

  it('should ask for a chunk', () => {
    expect(BinaryScanner.fileStreamType).toEqual('chunk');
  });

  it('should report a proper scanner name', () => {
    expect(BinaryScanner.scannerName).toEqual('binary');
  });
});
