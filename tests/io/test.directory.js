import { EventEmitter } from 'events';

import { Directory } from 'io';

import { unexpectedSuccess } from '../helpers';


describe('Directory.getFiles()', () => {
  it('should return cached data when available', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1,
    };
    myDirectory.files = {
      'file.entry': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    const fakeWalkPromise = sinon.stub();

    return myDirectory.getFiles(fakeWalkPromise)
      .then((files) => {
        expect(files).toEqual(myDirectory.files);
        expect(fakeWalkPromise.called).toBeFalsy();
      });
  });

  it('should return files from fixtures', () => {
    const myDirectory = new Directory('tests/fixtures/io/');

    return myDirectory.getFiles()
      .then((files) => {
        const fileNames = Object.keys(files);
        expect(fileNames).toContain('dir1/file1.txt');
        expect(fileNames).toContain('dir2/file2.txt');
        expect(fileNames).toContain('dir2/dir3/file3.txt');
      });
  });

  it('can be configured to not scan file paths', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.setScanFileCallback((filePath) => {
      return !filePath.startsWith('dir2');
    });

    return myDirectory.getFiles()
      .then((files) => {
        const fileNames = Object.keys(files);
        expect(fileNames).toContain('dir1/file1.txt');
        expect(fileNames).not.toContain('dir2/file2.txt');
        expect(fileNames).not.toContain('dir2/dir3/file3.txt');
      });
  });

  it('can be configured to scan all dirs and to include a single file', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.setScanFileCallback((filePath, isDir) => {
      if (isDir) {
        return true;
      }
      return filePath === 'dir2/dir3/file3.txt';
    });

    return myDirectory.getFiles()
      .then((files) => {
        const fileNames = Object.keys(files);
        expect(fileNames).not.toContain('dir1/file1.txt');
        expect(fileNames).not.toContain('dir2/file2.txt');
        expect(fileNames).toContain('dir2/dir3/file3.txt');
      });
  });
});

describe('Directory._getPath()', () => {
  it('should reject if not a file that exists', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getPath('whatever')
          .then(unexpectedSuccess)
          .catch((err) => {
            expect(err.message).toContain(
              '"whatever" does not exist in this dir.'
            );
          });
      });
  });

  it('should reject if path does not start with base', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      '../file1.txt': {},
    };
    return myDirectory.getPath('../file1.txt')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('Path argument must be relative');
      });
  });

  it("should reject if path starts with '/'", () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      '/file1.txt': {},
    };
    return myDirectory.getPath('/file1.txt')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('Path argument must be relative');
      });
  });
});

describe('Directory.getFileAsStream()', () => {
  it('should return a stream', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsStream('dir2/dir3/file3.txt');
      })
      .then((readStream) => {
        return new Promise((resolve, reject) => {
          let content = '';
          readStream
            .on('readable', () => {
              let chunk;
              // eslint-disable-next-line no-cond-assign
              while ((chunk = readStream.read()) !== null) {
                content += chunk.toString();
              }
            })
            .on('end', () => {
              resolve(content);
            })
            .on('error', (err) => {
              reject(err);
            });
        })
          .then((content) => {
            expect(content).toEqual('123\n');
          });
      });
  });

  it('should reject if file is too big', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'big.file': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myDirectory.getFileAsStream('big.file')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File "big.file" is too large');
      });
  });
});


describe('Directory.getFileAsString()', () => {
  it('should strip a BOM', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsString('dir3/foo.txt');
      })
      .then((content) => {
        expect(content.charCodeAt(0)).not.toEqual(0xFEFF);
      });
  });

  it('should return a string', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsString('dir2/dir3/file3.txt');
      })
      .then((string) => {
        expect(string).toEqual('123\n');
      });
  });

  it('should reject if stream emits error', () => {
    const fakeStreamEmitter = new EventEmitter();

    const myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      'file.error': {},
      'chrome.manifest': {},
    };

    myDirectory.getFileAsStream = () => {
      setTimeout(() => {
        fakeStreamEmitter.emit('error', new Error('¡hola!'));
      }, 0);
      return Promise.resolve(fakeStreamEmitter);
    };

    return myDirectory.getFileAsString('file.error')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('¡hola!');
      });
  });

  it('should reject if file is too big', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    const fakeFileMeta = {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'big.file': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myDirectory.getFileAsString('big.file')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File "big.file" is too large');
      });
  });
});

/*
  Using a file located in:

  tests/fixtures/io/dir2/dir3/file3.txt

  The location is not relevant, the file contents are.
*/
describe('Directory.getChunkAsBuffer()', () => {
  it('should get a buffer', () => {
    const myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        // Just grab the first two characters.
        return myDirectory.getChunkAsBuffer('dir2/dir3/file3.txt', 2);
      })
      .then((buffer) => {
        // The file contains: 123\n. This tests that we are getting just
        // the first two characters in the buffer.
        expect(buffer.toString()).toEqual('12');
      });
  });
});
