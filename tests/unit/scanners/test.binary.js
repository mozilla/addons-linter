import BinaryScanner from 'scanners/binary';
import { FLAGGED_FILE_MAGIC_NUMBERS } from 'const';
import * as messages from 'messages';

describe('Binary', () => {
  it('should do nothing on a text file', async () => {
    const buffer = Buffer.from('wat');
    const binaryScanner = new BinaryScanner(buffer, 'wat.txt');

    const { linterMessages } = await binaryScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should notice a flagged file', async () => {
    await Promise.all(
      FLAGGED_FILE_MAGIC_NUMBERS.map(async (magic) => {
        const buffer = Buffer.from(magic);
        const binaryScanner = new BinaryScanner(buffer, 'wat.txt');

        const { linterMessages } = await binaryScanner.scan();
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.FLAGGED_FILE_TYPE.code);
        expect(linterMessages[0].file).toEqual('wat.txt');
      })
    );
  });

  it('should ask for a chunk', () => {
    expect(BinaryScanner.fileResultType).toEqual('chunk');
  });

  it('should report a proper scanner name', () => {
    expect(BinaryScanner.scannerName).toEqual('binary');
  });
});
