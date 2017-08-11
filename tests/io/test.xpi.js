import fs from 'fs';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

import { Xpi } from 'io';
import { DEFLATE_COMPRESSION, NO_COMPRESSION } from 'const';

import { unexpectedSuccess } from '../helpers';


const defaultData = {
  compressionMethod: DEFLATE_COMPRESSION,
};

const chromeManifestEntry = Object.assign({}, defaultData, {
  compressedSize: 138,
  uncompressedSize: 275,
  fileName: 'chrome.manifest',
});

const installRdfEntry = Object.assign({}, defaultData, {
  compressedSize: 416,
  uncompressedSize: 851,
  fileName: 'install.rdf',
});

const dupeInstallRdfEntry = Object.assign({}, defaultData, {
  compressedSize: 416,
  uncompressedSize: 851,
  fileName: 'install.rdf',
});

const jsMainFileEntry = Object.assign({}, defaultData, {
  compressedSize: 41,
  uncompressedSize: 85,
  fileName: 'main.js',
});

const jsSecondaryFileEntry = Object.assign({}, defaultData, {
  compressedSize: 456,
  uncompressedSize: 851,
  fileName: 'secondary.js',
});

const chromeContentDir = {
  compressionMethod: NO_COMPRESSION,
  compressedSize: 0,
  uncompressedSize: 0,
  fileName: 'chrome/content/',
};

describe('Xpi.open()', function xpiCallback() {
  beforeEach(() => {
    this.fakeZipFile = {
      testprop: 'I am the fake zip',
    };
    this.openStub = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should resolve with zipfile', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);
    return myXpi.open()
      .then((zipfile) => {
        expect(zipfile.testprop).toEqual('I am the fake zip');
      });
  });

  it('should reject on error', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(new Error('open() test error'));
    return myXpi.open()
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('open() test');
      });
  });
});


describe('xpi.getFiles()', function getFilesCallback() {
  beforeEach(() => {
    const onStub = sinon.stub();
    // Can only yield data to the
    // callback once.
    this.entryStub = onStub
      .withArgs('entry');

    this.closeStub = onStub
      .withArgs('close');

    this.fakeZipFile = {
      on: onStub,
    };
    this.openStub = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should init class props as expected', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    expect(myXpi.path).toEqual('foo/bar');
    expect(typeof myXpi.files).toEqual('object');
    expect(Object.keys(myXpi.files).length).toEqual(0);
  });

  it('should return cached data when available', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };
    return myXpi.getFiles()
      .then((files) => {
        expect(files).toEqual(myXpi.files);
        expect(this.openStub.called).toBeFalsy();
      });
  });

  it('should contain expected files', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const expected = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    // If we could use yields multiple times here we would
    // but sinon doesn't support it when the stub is only
    // invoked once (e.g. to init the event handler).
    const onEventsSubscribed = () => {
      // Directly call the 'entry' event callback as if
      // we are actually processing entries in a
      // zip.
      const entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, chromeManifestEntry);
      entryCallback.call(null, chromeContentDir);
      entryCallback.call(null, installRdfEntry);
    };

    // Call the close event callback
    this.closeStub.yieldsAsync();

    return myXpi.getFiles(onEventsSubscribed)
      .then((files) => {
        expect(files).toEqual(expected);
      });
  });

  it('can be configured to exclude files', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const onEventsSubscribed = () => {
      // Directly call the 'entry' event callback as if
      // we are actually processing entries in a
      // zip.
      const entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, chromeManifestEntry);
      entryCallback.call(null, chromeContentDir);
      entryCallback.call(null, installRdfEntry);
    };

    // Call the close event callback
    this.closeStub.yieldsAsync();

    myXpi.setScanFileCallback((filePath) => {
      return !/install\.rdf/.test(filePath);
    });
    return myXpi.getFiles(onEventsSubscribed)
      .then((files) => {
        expect(files['chrome.manifest']).toEqual(chromeManifestEntry);
        expect(files['install.rdf']).not.toBeDefined();
      });
  });

  it('can be configured to exclude files when cached', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Populate the file cache:
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    // Call the close event callback
    this.closeStub.yieldsAsync();

    myXpi.setScanFileCallback((filePath) => {
      return !/install\.rdf/.test(filePath);
    });
    return myXpi.getFiles()
      .then((files) => {
        expect(files['chrome.manifest']).toEqual(chromeManifestEntry);
        expect(files['install.rdf']).not.toBeDefined();
      });
  });

  it('should reject on duplicate entries', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const onEventsSubscribed = () => {
      const entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, installRdfEntry);
      entryCallback.call(null, dupeInstallRdfEntry);
    };

    return myXpi.getFiles(onEventsSubscribed)
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('DuplicateZipEntry');
      });
  });

  it('should reject on errors in open()', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);

    this.openStub.yieldsAsync(new Error('open test'), this.fakeZipFile);
    return myXpi.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('open test');
      });
  });
});


describe('Xpi.getFile()', function getFileCallback() {
  it('should throw if fileStreamType is incorrect', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    expect(() => {
      myXpi.getFile('whatever-file', 'whatever');
    }).toThrowError('Unexpected fileStreamType value "whatever"');
  });

  it('should call getFileAsString', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFile = 'fakeFile';
    myXpi.getFileAsString = sinon.stub();
    myXpi.getFile(fakeFile, 'string');
    expect(myXpi.getFileAsString.calledWith(fakeFile)).toBeTruthy();
  });

  it('should call getFileAsStream', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFile = 'fakeFile';
    myXpi.getFileAsStream = sinon.stub();
    myXpi.getFile(fakeFile, 'stream');
    expect(myXpi.getFileAsStream.calledWith(fakeFile)).toBeTruthy();
  });
});

describe('Xpi.checkPath()', function checkPathCallback() {
  it('should reject if path does not exist', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    return myXpi.getFileAsStream('whatever')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('Path "whatever" does not exist');
      });
  });

  it('should reject if file is too big', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFileMeta = {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myXpi.getFileAsStream('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File "install.rdf" is too large');
      });
  });

  it('should reject if file is too big for getFileAsString too', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFileMeta = {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myXpi.getFileAsString('install.rdf')
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
describe('Xpi.getChunkAsBuffer()', function getChunkAsBufferCallback() {
  beforeEach(() => {
    this.openReadStreamStub = sinon.stub();

    this.fakeZipFile = {
      openReadStream: this.openReadStreamStub,
    };
    this.openStub = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should reject if error in openReadStream', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yieldsAsync(
      new Error('getChunkAsBuffer openReadStream test'));

    return myXpi.getChunkAsBuffer('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('getChunkAsBuffer openReadStream test');
      });
  });

  it('should resolve with a buffer', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('123\n');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    // Just grab the first two characters.
    return myXpi.getChunkAsBuffer('install.rdf', 2)
      .then((buffer) => {
        // The file contains: 123\n. This tests that we are getting just
        // the first two characters in the buffer.
        expect(buffer.toString()).toEqual('12');
      });
  });
});


describe('Xpi.getFileAsStream()', function getFileAsStreamCallback() {
  beforeEach(() => {
    this.openReadStreamStub = sinon.stub();

    this.fakeZipFile = {
      openReadStream: this.openReadStreamStub,
    };
    this.openStub = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should reject if error in openReadStream', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yieldsAsync(
      new Error('getFileAsStream openReadStream test'));

    return myXpi.getFileAsStream('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('getFileAsStream openReadStream test');
      });
  });

  it('should resolve with a readable stream', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsStream('install.rdf')
      .then((readStream) => {
        return new Promise((resolve, reject) => {
          let chunks = '';
          readStream
            .on('readable', () => {
              let chunk;
              // eslint-disable-next-line no-cond-assign
              while ((chunk = readStream.read()) !== null) {
                chunks += chunk.toString();
              }
            })
            .on('end', () => {
              resolve(chunks);
            })
            .on('error', (err) => {
              reject(err);
            });
        })
          .then((chunks) => {
            const [chunk1, chunk2] = chunks.split('\n');
            expect(chunk1).toEqual('line one');
            expect(chunk2).toEqual('line two');
          });
      });
  });

  it('should resolve with a string', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsString('install.rdf')
      .then((string) => {
        expect(string).toEqual('line one\nline two');
      });
  });

  it('should strip a BOM', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = fs.createReadStream('tests/fixtures/io/dir3/foo.txt');
    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsString('install.rdf')
      .then((string) => {
        expect(string.charCodeAt(0) === 0xFEFF).toBeFalsy();
      });
  });

  it('should reject if error in openReadStream from readAsString', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yields(
      new Error('getFileAsString openReadStream test'));

    return myXpi.getFileAsString('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('getFileAsString openReadStream test');
      });
  });

  it('should reject if stream emits error', () => {
    const fakeStreamEmitter = new EventEmitter();

    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    myXpi.getFileAsStream = () => {
      setTimeout(() => {
        fakeStreamEmitter.emit('error', new Error('¡hola!'));
      }, 0);
      return Promise.resolve(fakeStreamEmitter);
    };

    return myXpi.getFileAsString('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('¡hola!');
      });
  });
});

describe('Xpi.getFilesByExt()', function getFilesByExtCallback() {
  beforeEach(() => {
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should return all JS files', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
      'main.js': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    return myXpi.getFilesByExt('.js')
      .then((jsFiles) => {
        expect(jsFiles.length).toEqual(2);
        expect(jsFiles[0]).toEqual('main.js');
        expect(jsFiles[1]).toEqual('secondary.js');

        for (let i = 0; i < jsFiles.length; i++) {
          expect(jsFiles[i].endsWith('.js')).toBeTruthy();
        }
      });
  });

  it('should return all CSS files', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'other.css': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
      'styles.css': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    return myXpi.getFilesByExt('.css')
      .then((cssFiles) => {
        expect(cssFiles.length).toEqual(2);
        expect(cssFiles[0]).toEqual('other.css');
        expect(cssFiles[1]).toEqual('styles.css');

        for (let i = 0; i < cssFiles.length; i++) {
          expect(cssFiles[i].endsWith('.css')).toBeTruthy();
        }
      });
  });

  it('should return all HTML files', () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
      'index.html': jsMainFileEntry,
      'second.htm': jsMainFileEntry,
      'third.html': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    return myXpi.getFilesByExt('.html', '.htm')
      .then((htmlFiles) => {
        expect(htmlFiles.length).toEqual(3);
        expect(htmlFiles[0]).toEqual('index.html');
        expect(htmlFiles[1]).toEqual('second.htm');
        expect(htmlFiles[2]).toEqual('third.html');

        for (let i = 0; i < htmlFiles.length; i++) {
          expect(htmlFiles[i].endsWith('.html') ||
                    htmlFiles[i].endsWith('.htm')).toBeTruthy();
        }
      });
  });

  it("should throw if file extension doesn't start with '.'", () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    return myXpi.getFilesByExt('css')
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('File extension must start with');
      });
  });
});
