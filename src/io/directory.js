import * as path from 'path';
import { createReadStream } from 'fs';
import firstChunkStream from 'first-chunk-stream';
import stripBomStream from 'strip-bom-stream';

import { IOBase } from 'io/base';
import { walkPromise } from 'io/utils';

import { singleLineString } from '../utils';


import log from 'logger';


export class Directory extends IOBase {

  getFiles(_walkPromise=walkPromise) {

    // If we have already processed this directory and have data
    // on this instance return that.
    if (Object.keys(this.files).length) {
      log.info(singleLineString`Files already exist for directory
               "${this.path}" returning cached data`);
      return Promise.resolve(this.files);
    }

    return _walkPromise(
      this.path, {
        shouldIncludePath: (...args) => this.shouldScanFile(...args),
      })
      .then((files) => {
        this.files = files;
        this.entries = Object.keys(files);
        return files;
      });
  }

  getPath(relativeFilePath) {
    if (!this.files.hasOwnProperty(relativeFilePath)) {
      return Promise.reject(
        new Error(`Path "${relativeFilePath}" does not exist in this dir.`));
    }

    if (this.files[relativeFilePath].size > this.maxSizeBytes) {
      return Promise.reject(
        new Error(`File "${relativeFilePath}" is too large. Aborting`));
    }

    var absoluteDirPath = path.resolve(this.path);
    var filePath = path.resolve(path.join(absoluteDirPath, relativeFilePath));

    // This is belt and braces. Should never happen that a file was in
    // the files object and yet doesn't meet these requirements.
    if (!filePath.startsWith(absoluteDirPath) ||
        relativeFilePath.startsWith('/')) {
      return Promise.reject(
        new Error(`Path argument must be relative to ${this.path}`));
    }

    return Promise.resolve(filePath);
  }

  getFileAsStream(relativeFilePath) {
    return this.getPath(relativeFilePath)
      .then((filePath) => {
        return Promise.resolve(createReadStream(filePath, {
          flags: 'r',
          encoding: 'utf8',
          autoClose: true,
        }).pipe(stripBomStream()));
      });
  }

  getFileAsString(path) {
    return this.getFileAsStream(path)
      .then((readStream) => {
        return new Promise((resolve, reject) => {
          var content = '';
          readStream.on('readable', () => {
            var chunk;
            while (null !== (chunk = readStream.read())) {
              content += chunk.toString();
            }
          });

          readStream.on('end', () => {
            resolve(content);
          });

          readStream.on('error', reject);
        });
      });
  }

  getChunkAsBuffer(relativeFilePath, chunkLength) {
    return this.getPath(relativeFilePath)
      .then((filePath) => {
        return new Promise((resolve) => {
          createReadStream(filePath, {
            flags: 'r',
            // This is important because you don't want to encode the
            // bytes if you are doing a binary check.
            encoding: null,
            autoClose: true,
          })
          .pipe(
            firstChunkStream({chunkLength: chunkLength},
              function(_, enc) {
                resolve(enc);
              }
            )
          );
        });
      });
  }
}
