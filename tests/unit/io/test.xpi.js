import fs from 'fs';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

import { DEFLATE_COMPRESSION, NO_COMPRESSION } from 'linter/const';
import { Xpi } from 'io';

import { readStringFromStream } from '../helpers';

const defaultData = {
  compressionMethod: DEFLATE_COMPRESSION,
};

const chromeManifestEntry = Object.assign({}, defaultData, {
  compressedSize: 138,
  uncompressedSize: 275,
  fileName: 'chrome.manifest',
});

const installFileEntry = Object.assign({}, defaultData, {
  compressedSize: 416,
  uncompressedSize: 851,
  fileName: 'manifest.json',
});

const dupeInstallFileEntry = Object.assign({}, defaultData, {
  compressedSize: 416,
  uncompressedSize: 851,
  fileName: 'manifest.json',
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

  it('should resolve with zipfile', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const zipfile = await myXpi.open();
    expect(zipfile.testprop).toEqual('I am the fake zip');
  });

  it('should reject on error', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(new Error('open() test error'));

    await expect(myXpi.open()).rejects.toThrow('open() test');
  });
});

describe('xpi.getFiles()', function getFilesCallback() {
  beforeEach(() => {
    const onStub = sinon.stub();
    // Can only yield data to the
    // callback once.
    this.entryStub = onStub.withArgs('entry');

    this.closeStub = onStub.withArgs('close');

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

  it('should return cached data when available', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    await expect(myXpi.getFiles()).resolves.toEqual(myXpi.files);
    expect(this.openStub.called).toBeFalsy();
  });

  it('should contain expected files', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const expected = {
      'manifest.json': installFileEntry,
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
      entryCallback.call(null, installFileEntry);
    };

    // Call the close event callback
    this.closeStub.yieldsAsync();

    await expect(myXpi.getFiles(onEventsSubscribed)).resolves.toEqual(expected);
  });

  it('can be configured to exclude files', async () => {
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
      entryCallback.call(null, installFileEntry);
    };

    // Call the close event callback
    this.closeStub.yieldsAsync();

    myXpi.setScanFileCallback((filePath) => {
      return !/manifest\.json/.test(filePath);
    });

    const files = await myXpi.getFiles(onEventsSubscribed);
    expect(files['chrome.manifest']).toEqual(chromeManifestEntry);
    expect(files['manifest.json']).not.toBeDefined();
  });

  it('can be configured to exclude files when cached', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    // Populate the file cache:
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    // Call the close event callback
    this.closeStub.yieldsAsync();

    myXpi.setScanFileCallback((filePath) => {
      return !/manifest\.json/.test(filePath);
    });

    const files = await myXpi.getFiles();
    expect(files['chrome.manifest']).toEqual(chromeManifestEntry);
    expect(files['manifest.json']).not.toBeDefined();
  });

  it('should reject on duplicate entries', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const onEventsSubscribed = () => {
      const entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, installFileEntry);
      entryCallback.call(null, dupeInstallFileEntry);
    };

    await expect(myXpi.getFiles(onEventsSubscribed)).rejects.toThrow(
      'DuplicateZipEntry'
    );
  });

  it('should reject on errors in open()', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);

    this.openStub.yieldsAsync(new Error('open test'), this.fakeZipFile);

    await expect(myXpi.getFiles()).rejects.toThrow('open test');
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
  it('should reject if path does not exist', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    await expect(myXpi.getFileAsStream('whatever')).rejects.toThrow(
      'Path "whatever" does not exist'
    );
  });

  it('should reject if file is too big', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFileMeta = {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'manifest.json': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    await expect(myXpi.getFileAsStream('manifest.json')).rejects.toThrow(
      'File "manifest.json" is too large'
    );
  });

  it('should reject if file is too big for getFileAsString too', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    const fakeFileMeta = {
      uncompressedSize: 1024 * 1024 * 102,
    };

    myXpi.files = {
      'manifest.json': fakeFileMeta,
      'chrome.manifest': fakeFileMeta,
    };

    await expect(myXpi.getFileAsString('manifest.json')).rejects.toThrow(
      'File "manifest.json" is too large'
    );
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

  it('should reject if error in openReadStream', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yieldsAsync(
      new Error('getChunkAsBuffer openReadStream test')
    );

    await expect(myXpi.getChunkAsBuffer('manifest.json')).rejects.toThrow(
      'getChunkAsBuffer openReadStream test'
    );
  });

  it('should resolve with a buffer', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('123\n');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    // Just grab the first two characters.
    const buffer = await myXpi.getChunkAsBuffer('manifest.json', 2);
    // The file contains: 123\n. This tests that we are getting just
    // the first two characters in the buffer.
    expect(buffer.toString()).toEqual('12');
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

  it('should reject if error in openReadStream', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yieldsAsync(
      new Error('getFileAsStream openReadStream test')
    );

    await expect(myXpi.getFileAsStream('manifest.json')).rejects.toThrow(
      'getFileAsStream openReadStream test'
    );
  });

  it('should resolve with a readable stream', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    const readStream = await myXpi.getFileAsStream('manifest.json');

    const chunks = await readStringFromStream(readStream);
    const [chunk1, chunk2] = chunks.split('\n');
    expect(chunk1).toEqual('line one');
    expect(chunk2).toEqual('line two');
  });

  it('should resolve with a string', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    await expect(myXpi.getFileAsString('manifest.json')).resolves.toBe(
      'line one\nline two'
    );
  });

  it('should strip a BOM', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    const rstream = fs.createReadStream('tests/fixtures/io/dir3/foo.txt');
    this.openReadStreamStub.yields(null, rstream);

    const string = await myXpi.getFileAsString('manifest.json');
    expect(string.charCodeAt(0) === 0xfeff).toBeFalsy();
  });

  it('should reject if error in openReadStream from readAsString', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yields(
      new Error('getFileAsString openReadStream test')
    );

    await expect(myXpi.getFileAsString('manifest.json')).rejects.toThrow(
      'getFileAsString openReadStream test'
    );
  });

  it('should reject if stream emits error', async () => {
    const fakeStreamEmitter = new EventEmitter();

    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    myXpi.getFileAsStream = () => {
      setTimeout(() => {
        fakeStreamEmitter.emit('error', new Error('¡hola!'));
      }, 0);
      return Promise.resolve(fakeStreamEmitter);
    };

    await expect(myXpi.getFileAsString('manifest.json')).rejects.toThrow(
      '¡hola!'
    );
  });
});

describe('Xpi.getFilesByExt()', function getFilesByExtCallback() {
  beforeEach(() => {
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should return all JS files', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
      'main.js': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    const jsFiles = await myXpi.getFilesByExt('.js');
    expect(jsFiles.length).toEqual(2);
    expect(jsFiles[0]).toEqual('main.js');
    expect(jsFiles[1]).toEqual('secondary.js');

    for (let i = 0; i < jsFiles.length; i++) {
      expect(jsFiles[i].endsWith('.js')).toBeTruthy();
    }
  });

  it('should return all CSS files', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'other.css': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
      'styles.css': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    const cssFiles = await myXpi.getFilesByExt('.css');
    expect(cssFiles.length).toEqual(2);
    expect(cssFiles[0]).toEqual('other.css');
    expect(cssFiles[1]).toEqual('styles.css');

    for (let i = 0; i < cssFiles.length; i++) {
      expect(cssFiles[i].endsWith('.css')).toBeTruthy();
    }
  });

  it('should return all HTML files', async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
      'index.html': jsMainFileEntry,
      'second.htm': jsMainFileEntry,
      'third.html': jsMainFileEntry,
      'secondary.js': jsSecondaryFileEntry,
    };

    const htmlFiles = await myXpi.getFilesByExt('.html', '.htm');
    expect(htmlFiles.length).toEqual(3);
    expect(htmlFiles[0]).toEqual('index.html');
    expect(htmlFiles[1]).toEqual('second.htm');
    expect(htmlFiles[2]).toEqual('third.html');

    for (let i = 0; i < htmlFiles.length; i++) {
      expect(
        htmlFiles[i].endsWith('.html') || htmlFiles[i].endsWith('.htm')
      ).toBeTruthy();
    }
  });

  it("should throw if file extension doesn't start with '.'", async () => {
    const myXpi = new Xpi('foo/bar', this.fakeZipLib);

    await expect(myXpi.getFilesByExt('css')).rejects.toThrow(
      'File extension must start with'
    );
  });
});
