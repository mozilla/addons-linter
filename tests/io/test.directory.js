import sinon from 'sinon';

import { EventEmitter } from 'events';

import { Directory } from 'io';
import { unexpectedSuccess } from '../helpers';


describe('Directory.getFiles()', function() {

  it('should return cached data when available', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
    var fakeFileMeta= {
      size: 1,
    };
    myDirectory.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    var fakeWalkPromise = sinon.stub();

    return myDirectory.getFiles(fakeWalkPromise)
      .then((files) => {
        expect(files).toEqual(myDirectory.files);
        expect(fakeWalkPromise.called).toBeFalsy();
      });
  });

  it('should return files from fixtures', () => {
    var myDirectory = new Directory('tests/fixtures/io/');

    return myDirectory.getFiles()
      .then((files) => {
        var fileNames = Object.keys(files);
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
        var fileNames = Object.keys(files);
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
        var fileNames = Object.keys(files);
        expect(fileNames).not.toContain('dir1/file1.txt');
        expect(fileNames).not.toContain('dir2/file2.txt');
        expect(fileNames).toContain('dir2/dir3/file3.txt');
      });
  });

});

describe('Directory._getPath()', function() {

  it('should reject if not a file that exists', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
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
    var myDirectory = new Directory('tests/fixtures/io/');
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
    var myDirectory = new Directory('tests/fixtures/io/');
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

describe('Directory.getFileAsStream()', function() {

  it('should return a stream', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsStream('dir2/dir3/file3.txt');
      })
      .then((readStream) => {
        return new Promise((resolve, reject) => {
          var content = '';
          readStream
            .on('readable', () => {
              var chunk;
              while (null !== (chunk = readStream.read())) {
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
    var myDirectory = new Directory('tests/fixtures/io/');
    var fakeFileMeta= {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myDirectory.getFileAsStream('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File "install.rdf" is too large');
      });
  });

});


describe('Directory.getFileAsString()', function() {

  it('should strip a BOM', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsString('dir3/foo.txt');
      })
      .then((content) => {
        expect(content.charCodeAt(0)).not.toEqual(0xFEFF);
      });
  });

  it('should return a string', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
    return myDirectory.getFiles()
      .then(() => {
        return myDirectory.getFileAsString('dir2/dir3/file3.txt');
      })
      .then((string) => {
        expect(string).toEqual('123\n');
      });
  });

  it('should reject if stream emits error', () => {
    var fakeStreamEmitter = new EventEmitter();

    var myDirectory = new Directory('tests/fixtures/io/');
    myDirectory.files = {
      'install.rdf': {},
      'chrome.manifest': {},
    };

    myDirectory.getFileAsStream = () => {
      setTimeout(() => {
        fakeStreamEmitter.emit('error', new Error('¡hola!'));
      }, 0);
      return Promise.resolve(fakeStreamEmitter);
    };

    return myDirectory.getFileAsString('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('¡hola!');
      });
  });

  it('should reject if file is too big', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
    var fakeFileMeta= {
      size: 1024 * 1024 * 102,
    };
    myDirectory.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myDirectory.getFileAsString('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File "install.rdf" is too large');
      });
  });

});

/*
  Using a file located in:

  tests/fixtures/io/dir2/dir3/file3.txt

  The location is not relevant, the file contents are.
*/
describe('Directory.getChunkAsBuffer()', function() {

  it('should get a buffer', () => {
    var myDirectory = new Directory('tests/fixtures/io/');
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
