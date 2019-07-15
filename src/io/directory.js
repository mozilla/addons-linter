import * as path from 'path';
import { createReadStream } from 'fs';

import FirstChunkStream from 'first-chunk-stream';
import stripBomStream from 'strip-bom-stream';
import { oneLine } from 'common-tags';

import { IOBase } from 'io/base';
import { walkPromise } from 'io/utils';
import log from 'logger';

export class Directory extends IOBase {
  async getFiles(_walkPromise = walkPromise) {
    // If we have already processed this directory and have data
    // on this instance return that.
    if (Object.keys(this.files).length) {
      log.info(oneLine`Files already exist for directory
               "${this.path}" returning cached data`);
      return this.files;
    }

    const files = await _walkPromise(this.path, {
      shouldIncludePath: (...args) => this.shouldScanFile(...args),
    });

    this.files = files;
    this.entries = Object.keys(files);
    return files;
  }

  async getPath(relativeFilePath) {
    if (!Object.prototype.hasOwnProperty.call(this.files, relativeFilePath)) {
      throw new Error(`Path "${relativeFilePath}" does not exist in this dir.`);
    }

    if (this.files[relativeFilePath].size > this.maxSizeBytes) {
      throw new Error(`File "${relativeFilePath}" is too large. Aborting`);
    }

    const absoluteDirPath = path.resolve(this.path);
    const filePath = path.resolve(path.join(absoluteDirPath, relativeFilePath));

    // This is belt and braces. Should never happen that a file was in
    // the files object and yet doesn't meet these requirements.
    if (
      !filePath.startsWith(absoluteDirPath) ||
      relativeFilePath.startsWith('/')
    ) {
      throw new Error(`Path argument must be relative to ${this.path}`);
    }

    return filePath;
  }

  async getFileAsStream(relativeFilePath, { encoding } = { encoding: 'utf8' }) {
    const filePath = await this.getPath(relativeFilePath);

    const readStream = createReadStream(filePath, {
      autoClose: true,
      encoding,
      flags: 'r',
    });

    return !encoding ? readStream : readStream.pipe(stripBomStream());
  }

  async getFileAsString(_path) {
    const readStream = await this.getFileAsStream(_path);

    return new Promise((resolve, reject) => {
      let content = '';
      readStream.on('readable', () => {
        let chunk;
        // eslint-disable-next-line no-cond-assign
        while ((chunk = readStream.read()) !== null) {
          content += chunk.toString();
        }
      });

      readStream.on('end', () => {
        resolve(content);
      });

      readStream.on('error', reject);
    });
  }

  async getChunkAsBuffer(relativeFilePath, chunkSize) {
    const filePath = await this.getPath(relativeFilePath);

    return new Promise((resolve) => {
      createReadStream(filePath, {
        flags: 'r',
        // This is important because you don't want to encode the
        // bytes if you are doing a binary check.
        encoding: null,
        autoClose: true,
      }).pipe(
        new FirstChunkStream({ chunkSize }, (_, enc) => {
          resolve(enc);
        })
      );
    });
  }
}
