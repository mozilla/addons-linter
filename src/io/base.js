import { singleLineString } from '../utils';
import { NotImplentedError } from 'exceptions';

/*
 * Base class for io operations for both an Xpi or
 * a directory
 */
export class IOBase {

  constructor(packageOrDirPath) {
    this.path = packageOrDirPath;
    this.files = {};
    this.entries = [];
    // If this is too large the node process will hit a RangeError
    // when it runs out of memory.
    let maxMegabytes = 100;
    this.maxSizeBytes = 1024 * 1024 * maxMegabytes;
  }

  getFile(path, streamOrString='string') {
    switch (streamOrString) {
      case 'stream':
        return this.getFileAsStream(path);
      case 'string':
        return this.getFileAsString(path);
      default:
        throw new Error(singleLineString`Unexpected streamOrString
          value "${streamOrString}" should be "string" or "stream"`);
    }
  }

  getFilesByExt(...extensions) {

    for (let ext of extensions) {
      if (ext.indexOf('.') !== 0) {
        // We use Promise.reject as we're not inside a `then()` or a
        // Promise constructor callback.
        // If we throw here it won't be caught.
        return Promise.reject(new Error("File extension must start with '.'"));
      }
    }

    return this.getFiles()
      .then((filesObject) => {
        let files = [];

        for (let filename in filesObject) {
          for (let ext of extensions) {
            if (filename.endsWith(ext)) {
              files.push(filename);
            }
          }
        }

        return files;
      });
  }

  getFiles() {
    return Promise.reject(
      new NotImplentedError('getFiles is not implemented'));
  }

  getFileAsStream() {
    return Promise.reject(
      new NotImplentedError('getFileAsStream is not implemented'));
  }

  getFileAsString() {
    return Promise.reject(
      new NotImplentedError('getFileAsString is not implemented'));
  }

}
