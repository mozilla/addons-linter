import { Readable } from 'stream';

import Xpi from 'xpi';
import { DEFLATE_COMPRESSION, NO_COMPRESSION } from 'constants';

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
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch(err => {
        assert.include(err.message, 'open() test');
      });
  });

});


describe('Xpi.getMetaData()', function() {

  beforeEach(() => {
    var onStub = sinon.stub();
    // Can only yield data to the
    // callback once.
    this.entryStub = onStub
      .withArgs('entry');

    this.endStub = onStub
      .withArgs('end');

    this.openReadStreamStub = sinon.stub();

    this.fakeZipFile = {
      on: onStub,
      openReadStream: this.openReadStreamStub,
    };
    this.openStub = sinon.stub();
    this.fakeZipLib = {
      open: this.openStub,
    };
  });

  it('should init class props as expected', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    assert.equal(myXpi.filename, 'foo/bar');
    assert.equal(typeof myXpi.metadata, 'object');
    assert.equal(Object.keys(myXpi.metadata).length, 0);
  });

  it('should return cached data when available', done => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.metadata = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };
    myXpi.getMetaData()
      .then(metadata => {
        assert.deepEqual(metadata, myXpi.metadata);
        assert.notOk(this.openStub.called);
        done();
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

    // Call the openReadStream callback
    this.openReadStreamStub.yields(null);

    // Call the end event callback
    this.endStub.yields();

    // If we could use yields multiple times here we would
    // but sinon doesn't support it when the stub is only
    // invoked once (e.g. to init the event handler).
    var onEventsSubscribed = () => {
      // Directly call the 'entry' event handler as if
      // we are actually processing entries in a
      // zip.
      myXpi.handleEntry(chromeManifestEntry, this.fakeZipFile);
      myXpi.handleEntry(chromeContentDir, this.fakeZipFile);
      myXpi.handleEntry(installRdfEntry, this.fakeZipFile);
    };

    return myXpi.getMetaData(onEventsSubscribed)
      .then(metadata => {
        assert.deepEqual(metadata, expected);
      });
  });


  it('should reject on errors in zipfile.openReadStream()', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yields(new Error('openReadStream test'));
    this.entryStub.yields(chromeManifestEntry);

    return myXpi.getMetaData()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch(err => {
        assert.include(err.message, 'openReadStream test');
      });
  });

  it('should reject on errors in open()', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);

    this.openStub.yieldsAsync(new Error('open test'), this.fakeZipFile);
    return myXpi.getMetaData()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch(err => {
        assert.include(err.message, 'open test');
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

  it('should reject if path does not exist', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.metadata = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    return myXpi.getFileAsStream('whatever')
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch(err => {
        assert.include(err.message, 'path does not exist');
      });
  });

  it('should reject if error in openReadStream', () => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.metadata = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);
    this.openReadStreamStub.yields(
      new Error('getFileAsStream openReadStream test'));

    return myXpi.getFileAsStream('install.rdf')
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch(err => {
        assert.include(err.message, 'getFileAsStream openReadStream test');
      });
  });

  it('should resolve with a readable stream', (done) => {
    var myXpi = new Xpi('foo/bar', this.fakeZipLib);
    myXpi.metadata = {
      'install.rdf': installRdfEntry,
      'chrome.manifest': chromeManifestEntry,
    };

    this.openStub.yieldsAsync(null, this.fakeZipFile);

    var rstream = new Readable();
    rstream.push('line one\n');
    rstream.push('line two');
    rstream.push(null);

    this.openReadStreamStub.yields(null, rstream);

    myXpi.getFileAsStream('install.rdf')
      .then((readStream) => {
        var chunks = '';
        readStream
          .on('readable', function () {
            var chunk;
            while (null !== (chunk = readStream.read())) {
              chunks += chunk.toString();
            }
          })
          .on('end', function () {
            var [chunk1, chunk2] = chunks.split('\n');
            assert.equal(chunk1, 'line one');
            assert.equal(chunk2, 'line two');
            done();
          });
      });
  });
});
