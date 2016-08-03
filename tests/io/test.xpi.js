import { Readable } from 'stream';
import { EventEmitter } from 'events';

import fs from 'fs';
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

describe('Xpi.open()', function() {

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
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);
    return myXpi.open()
      .then((zipfile) => {
        assert.equal(zipfile.testprop, 'I am the fake zip');
      });
  });

  it('should reject on error', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(new Error('open() test error'));
    return myXpi.open()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'open() test');
      });
  });

});


describe('xpi.getFiles()', function() {

  beforeEach(() => {
    var onStub = sinon.stub();
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
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    assert.equal(myXpi.path, 'foo/bar');
    assert.equal(typeof myXpi.files, 'object');
    assert.equal(Object.keys(myXpi.files).length, 0);
  });

  it('should return cached data when available', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };
    return myXpi.getFiles()
      .then((files) => {
        assert.deepEqual(files, myXpi.files);
        assert.notOk(this.openStub.called);
      });
  });

  it('should contain expected files', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    var expected = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    // If we could use yields multiple times here we would
    // but sinon doesn't support it when the stub is only
    // invoked once (e.g. to init the event handler).
    var onEventsSubscribed = () => {
      // Directly call the 'entry' event callback as if
      // we are actually processing entries in a
      // zip.
      var entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, chromeManifestEntry);
      entryCallback.call(null, chromeContentDir);
      entryCallback.call(null, installRdfEntry);
    };

    // Call the close event callback
    this.closeStub.yieldsAsync();

    return myXpi.getFiles(onEventsSubscribed)
      .then((files) => {
        assert.deepEqual(files, expected);
      });
  });

  it('can be configured to exclude files', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var onEventsSubscribed = () => {
      // Directly call the 'entry' event callback as if
      // we are actually processing entries in a
      // zip.
      var entryCallback = this.entryStub.firstCall.args[1];
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
        assert.equal(files['chrome.manifest'], chromeManifestEntry);
        assert.isUndefined(files['install.rdf']);
      });
  });

  it('can be configured to exclude files when cached', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
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
        assert.equal(files['chrome.manifest'], chromeManifestEntry);
        assert.isUndefined(files['install.rdf']);
      });
  });

  it('should reject on duplicate entries', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var onEventsSubscribed = () => {
      var entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, installRdfEntry);
      entryCallback.call(null, dupeInstallRdfEntry);
    };

    return myXpi.getFiles(onEventsSubscribed)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'DuplicateZipEntry');
      });
  });

  it('should reject on errors in open()', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);

    this.openStub.yieldsAsync(new Error('open test'), this.fakeZipFile);
    return myXpi.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'open test');
      });
  });
});


describe('Xpi.getFile()', function() {

  it('should throw if fileStreamType is incorrect', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    assert.throw(() => {
      myXpi.getFile('whatever-file', 'whatever');
    }, Error, /Unexpected fileStreamType value "whatever"/);
  });

  it('should call getFileAsString', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    var fakeFile = 'fakeFile';
    myXpi.getFileAsString = sinon.stub();
    myXpi.getFile(fakeFile, 'string');
    assert.ok(myXpi.getFileAsString.calledWith(fakeFile));
  });

  it('should call getFileAsStream', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    var fakeFile = 'fakeFile';
    myXpi.getFileAsStream = sinon.stub();
    myXpi.getFile(fakeFile, 'stream');
    assert.ok(myXpi.getFileAsStream.calledWith(fakeFile));
  });

});

describe('Xpi.checkPath()', function() {

  it('should reject if path does not exist', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    return myXpi.getFileAsStream('whatever')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'Path "whatever" does not exist');
      });
  });

  it('should reject if file is too big', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    var fakeFileMeta= {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myXpi.getFileAsStream('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(
          err.message, 'File "install.rdf" is too large');
      });
  });

  it('should reject if file is too big for getFileAsString too', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    var fakeFileMeta = {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'install.rdf': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    return myXpi.getFileAsString('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(
          err.message, 'File "install.rdf" is too large');
      });
  });

});

/*
  Using a file located in:

  tests/fixtures/io/dir2/dir3/file3.txt

  The location is not relevant, the file contents are.
*/
describe('Xpi.getChunkAsBuffer()', function() {

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
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yieldsAsync(
      new Error('getChunkAsBuffer openReadStream test'));

    return myXpi.getChunkAsBuffer('install.rdf')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'getChunkAsBuffer openReadStream test');
      });
  });

  it('should resolve with a buffer', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var rstream = new Readable();
    rstream.push('123\n');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    // Just grab the first two characters.
    return myXpi.getChunkAsBuffer('install.rdf', 2)
      .then((buffer) => {
        // The file contains: 123\n. This tests that we are getting just
        // the first two characters in the buffer.
        assert.equal(buffer.toString(), '12');
      });
  });

});


describe('Xpi.getFileAsStream()', function() {

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
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
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
        assert.include(err.message, 'getFileAsStream openReadStream test');
      });
  });

  it('should resolve with a readable stream', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsStream('install.rdf')
      .then((readStream) => {
        return new Promise((resolve, reject) => {
          var chunks = '';
          readStream
            .on('readable', () => {
              var chunk;
              while (null !== (chunk = readStream.read())) {
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
          var [chunk1, chunk2] = chunks.split('\n');
          assert.equal(chunk1, 'line one');
          assert.equal(chunk2, 'line two');
        });
      });
  });

  it('should resolve with a string', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsString('install.rdf')
      .then((string) => {
        assert.equal(string, 'line one\nline two');
      });
  });

  it('should strip a BOM', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var rstream = fs.createReadStream('tests/fixtures/io/dir3/foo.txt');
    this.openReadStreamStub.yields(null, rstream);

    return myXpi.getFileAsString('install.rdf')
      .then((string) => {
        assert.notOk(string.charCodeAt(0) === 0xFEFF);
      });
  });

  it('should reject if error in openReadStream from readAsString', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
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
        assert.include(err.message, 'getFileAsString openReadStream test');
      });
  });

  it('should reject if stream emits error', () => {
    var fakeStreamEmitter = new EventEmitter();

    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
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
        assert.include(err.message, '¡hola!');
      });
  });

});

describe('Xpi.getFilesByExt()', function() {

  beforeEach(() => {
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should return all JS files', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
      'main.js': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    return myXpi.getFilesByExt('.js')
      .then((jsFiles) => {
        assert.equal(jsFiles.length, 2);
        assert.equal(jsFiles[0], 'main.js');
        assert.equal(jsFiles[1], 'secondary.js');

        for (let i = 0; i < jsFiles.length; i++) {
          assert.ok(jsFiles[i].endsWith('.js'));
        }
      });
  });

  it('should return all CSS files', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'other.css': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
      'styles.css': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    return myXpi.getFilesByExt('.css')
      .then((cssFiles) => {
        assert.equal(cssFiles.length, 2);
        assert.equal(cssFiles[0], 'other.css');
        assert.equal(cssFiles[1], 'styles.css');

        for (let i = 0; i < cssFiles.length; i++) {
          assert.ok(cssFiles[i].endsWith('.css'));
        }
      });
  });

  it('should return all HTML files', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
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
        assert.equal(htmlFiles.length, 3);
        assert.equal(htmlFiles[0], 'index.html');
        assert.equal(htmlFiles[1], 'second.htm');
        assert.equal(htmlFiles[2], 'third.html');

        for (let i = 0; i < htmlFiles.length; i++) {
          assert.ok(htmlFiles[i].endsWith('.html') ||
                    htmlFiles[i].endsWith('.htm'));
        }
      });
  });

  it("should throw if file extension doesn't start with '.'", () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    return myXpi.getFilesByExt('css')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'File extension must start with');
      });
  });

});
