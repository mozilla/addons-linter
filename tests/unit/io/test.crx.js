import { ZipFile } from 'yauzl';

import { Crx } from 'io';
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

const chromeContentDir = {
  compressionMethod: NO_COMPRESSION,
  compressedSize: 0,
  uncompressedSize: 0,
  fileName: 'chrome/content/',
};

describe('Crx.open()', function openCallback() {
  beforeEach(() => {
    this.fakeCrxFile = {
      testprop: 'I am the fake zip',
    };
    this.openStub = sinon.stub();
    this.fakeParseCrx = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
    this.fakeFs = {
      readFile: () => {
        return Buffer.from('');
      },
    };
  });

  it('should open a CRX and return a zip', async () => {
    const myCrx = new Crx('tests/fixtures/extension.crx');
    const zipfile = await myCrx.open();
    expect(zipfile).toBeInstanceOf(ZipFile);
  });
});


describe('crx.getFiles()', function getFilesCallback() {
  beforeEach(() => {
    const onStub = sinon.stub();
    // Can only yield data to the callback once.
    this.entryStub = onStub.withArgs('entry');
    this.endStub = onStub.withArgs('end');

    this.fakeZipFile = {
      on: onStub,
    };

    this.fromBufferStub = sinon.stub();
    this.readFileStub = sinon.stub();

    this.fakeZipLib = {
      fromBuffer: this.fromBufferStub,
    };
    this.fakeParseCrx = sinon.stub();
    this.fakeFs = {
      readFile: this.readFileStub,
    };
  });

  it('should init class props as expected', () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib);
    expect(myCrx.path).toEqual('foo/bar');
    expect(typeof myCrx.files).toEqual('object');
    expect(Object.keys(myCrx.files).length).toEqual(0);
  });

  it('should return cached data when available', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib);
    myCrx.files = {
      'manifest.json': installFileEntry,
      'chrome.manifest': chromeManifestEntry,
    };
    const files = await myCrx.getFiles();
    expect(files).toEqual(myCrx.files);
    expect(this.fromBufferStub.called).toBeFalsy();
  });

  it('should contain expected files', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
      this.fakeFs);
    const expected = {
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.fromBufferStub.yieldsAsync(null, this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, { body: Buffer.from('foo') });
    this.readFileStub.yieldsAsync(null, Buffer.from('bar'));

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
    };

    // Call the close event callback
    this.endStub.yieldsAsync();

    const files = await myCrx.getFiles(onEventsSubscribed);
    expect(files).toEqual(expected);
  });

  it('should reject on duplicate entries', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
      this.fakeFs);
    this.fromBufferStub.yieldsAsync(null, this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, { body: Buffer.from('foo') });
    this.readFileStub.yieldsAsync(null, Buffer.from('bar'));

    const onEventsSubscribed = () => {
      const entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, installFileEntry);
      entryCallback.call(null, dupeInstallFileEntry);
    };

    try {
      await myCrx.getFiles(onEventsSubscribed);
      unexpectedSuccess();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('DuplicateZipEntry');
    }
  });

  it('should reject on errors in readFile() in open()', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
      this.fakeFs);

    this.readFileStub.yieldsAsync(new Error('open test'), Buffer.from('bar'));

    try {
      await myCrx.getFiles();
      unexpectedSuccess();
    } catch (err) {
      expect(err.message).toContain('open test');
    }
  });

  it('should reject on errors in parseCRX() in open()', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
      this.fakeFs);

    this.readFileStub.yieldsAsync(null, Buffer.from('bar'));
    this.fakeParseCrx.yieldsAsync(new Error('open test'), null);

    try {
      await myCrx.getFiles();
      unexpectedSuccess();
    } catch (err) {
      expect(err.message).toContain('open test');
    }
  });

  it('should reject on errors in fromBuffer() in open()', async () => {
    const myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
      this.fakeFs);

    this.fromBufferStub.yieldsAsync(new Error('open test'), this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, { body: Buffer.from('foo') });
    this.readFileStub.yieldsAsync(null, Buffer.from('bar'));

    try {
      await myCrx.getFiles();
      unexpectedSuccess();
    } catch (err) {
      expect(err.message).toContain('open test');
    }
  });
});
