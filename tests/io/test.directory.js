import { EventEmitter } from 'events';

import { Directory } from 'io';


describe('Directory.getFiles()', () => {
  it('should return cached data when available', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1,
    };
    myDirectory.files = {
      'manifest.json': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    const fakeWalkPromise = sinon.stub();

    const files = await myDirectory.getFiles(fakeWalkPromise);
    expect(files).toEqual(myDirectory.files);
    expect(fakeWalkPromise.called).toBeFalsy();
  });

  it('should return files from fixtures', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    const files = await myDirectory.getFiles();
    const fileNames = Object.keys(files);
    expect(fileNames).toContain('dir1/file1.txt');
    expect(fileNames).toContain('dir2/file2.txt');
    expect(fileNames).toContain('dir2/dir3/file3.txt');
  });

  it('can be configured to not scan file paths', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.setScanFileCallback((filePath) => {
      return !filePath.startsWith('dir2');
    });

    const files = await myDirectory.getFiles();
    const fileNames = Object.keys(files);
    expect(fileNames).toContain('dir1/file1.txt');
    expect(fileNames).not.toContain('dir2/file2.txt');
    expect(fileNames).not.toContain('dir2/dir3/file3.txt');
  });

  it('can be configured to scan all dirs and to include a single file', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.setScanFileCallback((filePath, isDir) => {
      if (isDir) {
        return true;
      }
      return filePath === 'dir2/dir3/file3.txt';
    });

    const files = await myDirectory.getFiles();
    const fileNames = Object.keys(files);
    expect(fileNames).not.toContain('dir1/file1.txt');
    expect(fileNames).not.toContain('dir2/file2.txt');
    expect(fileNames).toContain('dir2/dir3/file3.txt');
  });
});

describe('Directory._getPath()', () => {
  it('should reject if not a file that exists', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    await myDirectory.getFiles();
    await expect(
      myDirectory.getPath('whatever')
    ).rejects.toThrow('"whatever" does not exist in this dir.');
  });

  it('should reject if path does not start with base', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      '../file1.txt': {},
    };

    await expect(
      myDirectory.getPath('../file1.txt')
    ).rejects.toThrow('Path argument must be relative');
  });

  it("should reject if path starts with '/'", async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      '/file1.txt': {},
    };

    await expect(
      myDirectory.getPath('/file1.txt')
    ).rejects.toThrow('Path argument must be relative');
  });
});

function readStringFromStream(readStream, transform) {
  return new Promise((resolve, reject) => {
    let content = '';
    readStream.on('readable', () => {
      let chunk;
      // eslint-disable-next-line no-cond-assign
      while ((chunk = readStream.read()) !== null) {
        content += chunk.toString(transform);
      }
    });
    readStream.on('end', () => {
      resolve(content);
    });
    readStream.on('error', reject);
  });
}

describe('Directory.getFileAsStream()', () => {
  it('should return a stream', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    await myDirectory.getFiles();

    const readStream = await myDirectory.getFileAsStream('dir2/dir3/file3.txt');

    const content = await readStringFromStream(readStream);
    expect(content).toEqual('123\n');
  });

  it('should not enforce utf-8 when encoding = null', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    await myDirectory.getFiles();

    const readStreamEncodingDefault = await myDirectory.getFileAsStream('dir2/dir3/file.png');

    const readStreamEncodingNull = await myDirectory.getFileAsStream(
      'dir2/dir3/file.png', {
        encoding: null,
      });

    const stringFromEncodingDefault = await readStringFromStream(readStreamEncodingDefault, 'binary');
    const stringFromEncodingNull = await readStringFromStream(readStreamEncodingNull, 'binary');

    // Ensure that by setting the encoding to null, the utf-8 encoding is not enforced
    // while reading binary data from the stream.
    expect(stringFromEncodingNull.slice(0, 8)).toEqual('\x89PNG\r\n\x1a\n');

    // Confirms that the default "utf-8" encoding behavior is still preserved when the encoding
    // is not been explicitly specified.
    expect(stringFromEncodingDefault.slice(0, 8)).not.toEqual('\x89PNG\r\n\x1a\n');
  });

  it('should reject if file is too big', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'manifest.json': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    await expect(
      myDirectory.getFileAsStream('manifest.json')
    ).rejects.toThrow('File "manifest.json" is too large');
  });
});


describe('Directory.getFileAsString()', () => {
  it('should strip a BOM', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    await myDirectory.getFiles();
    const content = await myDirectory.getFileAsString('dir3/foo.txt');
    expect(content.charCodeAt(0)).not.toEqual(0xFEFF);
  });

  it('should return a string', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    await myDirectory.getFiles();
    const string = await myDirectory.getFileAsString('dir2/dir3/file3.txt');
    expect(string).toEqual('123\n');
  });

  it('should reject if stream emits error', async () => {
    const fakeStreamEmitter = new EventEmitter();

    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      'manifest.json': {},
      'chrome.manifest': {},
    };

    myDirectory.getFileAsStream = () => {
      setTimeout(() => {
        fakeStreamEmitter.emit('error', new Error('¡hola!'));
      }, 0);
      return Promise.resolve(fakeStreamEmitter);
    };

    await expect(
      myDirectory.getFileAsString('manifest.json')
    ).rejects.toThrow('¡hola!');
  });

  it('should reject if file is too big', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'manifest.json': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    await expect(
      myDirectory.getFileAsString('manifest.json')
    ).rejects.toThrow('File "manifest.json" is too large');
  });
});

/*
  Using a file located in:

  tests/fixtures/io/dir2/dir3/file3.txt

  The location is not relevant, the file contents are.
*/
describe('Directory.getChunkAsBuffer()', () => {
  it('should get a buffer', async () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    await myDirectory.getFiles();
    // Just grab the first two characters.
    const buffer = await myDirectory.getChunkAsBuffer('dir2/dir3/file3.txt', 2);
    // The file contains: 123\n. This tests that we are getting just
    // the first two characters in the buffer.
    expect(buffer.toString()).toEqual('12');
  });
});
