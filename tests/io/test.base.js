import { IOBase } from 'io/base';
import { unexpectedSuccess } from '../helpers';


describe('io.IOBase()', function() {

  it('should init class props as expected', () => {
    var io = new IOBase('foo/bar');
    assert.equal(io.path, 'foo/bar');
    assert.equal(io.entries.length, 0);
    assert.equal(Object.keys(io.files).length, 0);
    assert.equal(typeof io.files, 'object');
    assert.equal(io.maxSizeBytes, 104857600);
  });

  it('should should reject calling getFiles()', () => {
    var io = new IOBase('foo/bar');

    return io.getFiles()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getFiles is not implemented');
      });
  });

  it('should should reject calling getFileAsString()', () => {
    var io = new IOBase('foo/bar');

    return io.getFileAsString()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'getFileAsString is not implemented');
      });
  });

  it('should should reject calling getFileAsString()', () => {
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

});
