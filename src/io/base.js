import { oneLine } from 'common-tags';

import { FLAGGED_FILE_MAGIC_NUMBERS_LENGTH, MAX_FILE_SIZE_MB } from 'linter/const';

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
    this.maxSizeBytes = 1024 * 1024 * MAX_FILE_SIZE_MB;
    // A callback that accepts a relative file path and returns
    // true if the path should be included in results for scanning.
    this.shouldScanFile = () => true;
  }

  setScanFileCallback(callback) {
    if (typeof callback === 'function') {
      this.shouldScanFile = callback;
    }
  }

  getFile(path, fileStreamType = 'string') {
    switch (fileStreamType) {
      case 'stream':
        return this.getFileAsStream(path);
      case 'string':
        return this.getFileAsString(path);
      case 'chunk':
        // Assuming that chunk is going to be primarily used for finding magic
        // numbers in files, then there's no need to have the default be longer
        // than that.
        return this.getChunkAsBuffer(path, FLAGGED_FILE_MAGIC_NUMBERS_LENGTH);

      default:
        throw new Error(oneLine`Unexpected fileStreamType
          value "${fileStreamType}" should be one of "string",
          "stream" or "chunk"`);
    }
  }

  async getFilesByExt(...extensions) {
    for (let i = 0; i < extensions.length; i++) {
      const ext = extensions[i];
      if (ext.indexOf('.') !== 0) {
        throw new Error("File extension must start with '.'");
      }
    }

    const filesObject = await this.getFiles();
    const files = [];

    Object.keys(filesObject).forEach((filename) => {
      extensions.forEach((ext) => {
        if (filename.endsWith(ext)) {
          files.push(filename);
        }
      });
    });

    return files;
  }

  async getFiles() {
    throw new Error('getFiles is not implemented');
  }

  async getFileAsStream() {
    throw new Error('getFileAsStream is not implemented');
  }

  async getFileAsString() {
    throw new Error('getFileAsString is not implemented');
  }

  async getChunkAsBuffer() {
    throw new Error('getChunkAsBuffer is not implemented');
  }
}
