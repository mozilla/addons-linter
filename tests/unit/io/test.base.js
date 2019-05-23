import { FLAGGED_FILE_MAGIC_NUMBERS_LENGTH } from 'linter/const';
import { IOBase } from 'io/base';

import { unexpectedSuccess } from '../helpers';

describe('io.IOBase()', () => {
  it('should init class props as expected', () => {
    const io = new IOBase('foo/bar');
    expect(io.path).toEqual('foo/bar');
    expect(io.entries.length).toEqual(0);
    expect(Object.keys(io.files).length).toEqual(0);
    expect(typeof io.files).toEqual('object');
    expect(io.maxSizeBytes).toEqual(104857600);
  });

  it('should reject calling getFiles()', async () => {
    const io = new IOBase('foo/bar');

    try {
      await io.getFiles();
      unexpectedSuccess();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('getFiles is not implemented');
    }
  });

  it('should reject calling getFileAsString()', async () => {
    const io = new IOBase('foo/bar');

    try {
      await io.getFileAsString();
      unexpectedSuccess();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('getFileAsString is not implemented');
    }
  });

  it('should reject calling getFileAsStream()', async () => {
    const io = new IOBase('foo/bar');

    try {
      await io.getFileAsStream();
      unexpectedSuccess();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('getFileAsStream is not implemented');
    }
  });

  it('should reject calling getChunkAsBuffer()', async () => {
    const io = new IOBase('foo/bar');

    try {
      await io.getChunkAsBuffer();
      unexpectedSuccess();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('getChunkAsBuffer is not implemented');
    }
  });

  it('should call getFileAsStream method via getFile()', () => {
    const io = new IOBase('foo/bar');
    io.getFileAsStream = sinon.stub();
    io.getFile('get-a-stream', 'stream');
    expect(io.getFileAsStream.calledWith('get-a-stream')).toBeTruthy();
  });

  it('should call getFileAsString method via getFile()', () => {
    const io = new IOBase('foo/bar');
    io.getFileAsString = sinon.stub();
    io.getFile('get-a-string', 'string');
    expect(io.getFileAsString.calledWith('get-a-string')).toBeTruthy();
  });

  it('should call getChunkAsBuffer method via getFile()', () => {
    const io = new IOBase('foo/bar');
    io.getChunkAsBuffer = sinon.stub();
    io.getFile('get-a-chunk-as-buffer', 'chunk');
    expect(
      io.getChunkAsBuffer.calledWith(
        'get-a-chunk-as-buffer',
        FLAGGED_FILE_MAGIC_NUMBERS_LENGTH
      )
    ).toBeTruthy();
  });

  it('should scan all files by default', () => {
    const io = new IOBase('foo/bar');
    expect(io.shouldScanFile('manifest.json')).toBeTruthy();
  });

  it('should allow configuration of which files can be scanned', () => {
    const io = new IOBase('foo/bar');
    expect(io.shouldScanFile('manifest.json')).toBeTruthy();
  });

  it('should ignore undefined scan file callbacks', () => {
    const io = new IOBase('foo/bar');
    io.setScanFileCallback(undefined);
    expect(io.shouldScanFile('manifest.json')).toBeTruthy();
  });

  it('should ignore a non-function scan file callback', () => {
    const io = new IOBase('foo/bar');
    io.setScanFileCallback(42); // this is not a function
    expect(io.shouldScanFile('manifest.json')).toBeTruthy();
  });
});
