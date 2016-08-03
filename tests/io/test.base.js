import { IOBase } from 'io/base';
import { unexpectedSuccess } from '../helpers';

import { FLAGGED_FILE_MAGIC_NUMBERS_LENGTH } from 'const';


describe('io.IOBase()', function() {

  it('should init class props as expected', () => {
    var io = new IOBase('foo/bar');
    assert.equal(io.path, 'foo/bar');
    assert.equal(io.entries.length, 0);
    assert.equal(Object.keys(io.files).length, 0);
    assert.equal(typeof io.files, 'object');
    assert.equal(io.maxSizeBytes, 104857600);
  });

  it('should reject calling getFiles()', () => {
    var io = new IOBase('foo/bar');

    return io.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getFiles is not implemented');
      });
  });

  it('should reject calling getFileAsString()', () => {
    var io = new IOBase('foo/bar');

    return io.getFileAsString()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getFileAsString is not implemented');
      });
  });

  it('should reject calling getFileAsString()', () => {
    var io = new IOBase('foo/bar');

    return io.getFileAsStream()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getFileAsStream is not implemented');
      });
  });

  it('should should reject calling getChunkAsBuffer()', () => {
    var io = new IOBase('foo/bar');

    return io.getChunkAsBuffer()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getChunkAsBuffer is not implemented');
      });
  });

  it('should call getFileAsStream method via getFile()', () => {
    var io = new IOBase('foo/bar');
    io.getFileAsStream = sinon.stub();
    io.getFile('get-a-stream', 'stream');
    assert.ok(io.getFileAsStream.calledWith('get-a-stream'));
  });

  it('should call getFileAsString method via getFile()', () => {
    var io = new IOBase('foo/bar');
    io.getFileAsString = sinon.stub();
    io.getFile('get-a-string', 'string');
    assert.ok(io.getFileAsString.calledWith('get-a-string'));
  });

  it('should call getChunkAsBuffer method via getFile()', () => {
    var io = new IOBase('foo/bar');
    io.getChunkAsBuffer = sinon.stub();
    io.getFile('get-a-chunk-as-buffer', 'chunk');
    assert.ok(io.getChunkAsBuffer.calledWith('get-a-chunk-as-buffer',
      FLAGGED_FILE_MAGIC_NUMBERS_LENGTH));
  });

  it('should scan all files by default', () => {
    const io = new IOBase('foo/bar');
    assert.ok(io.shouldScanFile('install.rdf'));
    assert.ok(io.shouldScanFile('manifest.json'));
  });

  it('should allow configuration of which files can be scanned', () => {
    const io = new IOBase('foo/bar');
    io.setScanFileCallback((fileName) => fileName !== 'install.rdf');
    assert.notOk(io.shouldScanFile('install.rdf'));
    assert.ok(io.shouldScanFile('manifest.json'));
  });

  it('should ignore undefined scan file callbacks', () => {
    const io = new IOBase('foo/bar');
    io.setScanFileCallback(undefined);
    assert.ok(io.shouldScanFile('manifest.json'));
  });

  it('should ignore a non-function scan file callback', () => {
    const io = new IOBase('foo/bar');
    io.setScanFileCallback(42); // this is not a function
    assert.ok(io.shouldScanFile('manifest.json'));
  });
});
