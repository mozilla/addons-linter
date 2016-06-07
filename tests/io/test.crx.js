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

const chromeContentDir = {
  compressionMethod: NO_COMPRESSION,
  compressedSize: 0,
  uncompressedSize: 0,
  fileName: 'chrome/content/',
};

describe('Crx.open()', function() {

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
        return new Buffer('');
      },
    };
  });

  it('should open a CRX and return a zip', () => {
    var myCrx = new Crx('tests/fixtures/extension.crx');
    return myCrx.open()
      .then((zipfile) => {
        assert.instanceOf(zipfile, ZipFile);
      });
  });

});


describe('crx.getFiles()', function() {

  beforeEach(() => {
    var onStub = sinon.stub();
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
    var myCrx = new Crx('foo/bar', this.fakeZipLib);
    assert.equal(myCrx.path, 'foo/bar');
    assert.equal(typeof myCrx.files, 'object');
    assert.equal(Object.keys(myCrx.files).length, 0);
  });

  it('should return cached data when available', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib);
    myCrx.files = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };
    return myCrx.getFiles()
      .then((files) => {
        assert.deepEqual(files, myCrx.files);
        assert.notOk(this.fromBufferStub.called);
      });
  });

  it('should contain expected files', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
                        this.fakeFs);
    var expected = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    // Return the fake zip to the open callback.
    this.fromBufferStub.yieldsAsync(null, this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, {body: new Buffer('foo')});
    this.readFileStub.yieldsAsync(null, new Buffer('bar'));

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
    this.endStub.yieldsAsync();

    return myCrx.getFiles(onEventsSubscribed)
      .then((files) => {
        assert.deepEqual(files, expected);
      });
  });

  it('should reject on duplicate entries', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
                        this.fakeFs);
    this.fromBufferStub.yieldsAsync(null, this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, {body: new Buffer('foo')});
    this.readFileStub.yieldsAsync(null, new Buffer('bar'));

    var onEventsSubscribed = () => {
      var entryCallback = this.entryStub.firstCall.args[1];
      entryCallback.call(null, installRdfEntry);
      entryCallback.call(null, dupeInstallRdfEntry);
    };

    return myCrx.getFiles(onEventsSubscribed)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'DuplicateZipEntry');
      });
  });

  it('should reject on errors in readFile() in open()', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
                        this.fakeFs);

    this.readFileStub.yieldsAsync(new Error('open test'), new Buffer('bar'));

    return myCrx.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'open test');
      });
  });

  it('should reject on errors in parseCRX() in open()', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
                        this.fakeFs);

    this.readFileStub.yieldsAsync(null, new Buffer('bar'));
    this.fakeParseCrx.yieldsAsync(new Error('open test'), null);

    return myCrx.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'open test');
      });
  });

  it('should reject on errors in fromBuffer() in open()', () => {
    var myCrx = new Crx('foo/bar', this.fakeZipLib, this.fakeParseCrx,
                        this.fakeFs);

    this.fromBufferStub.yieldsAsync(new Error('open test'), this.fakeZipFile);
    this.fakeParseCrx.yieldsAsync(null, {body: new Buffer('foo')});
    this.readFileStub.yieldsAsync(null, new Buffer('bar'));

    return myCrx.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'open test');
      });
  });
});
