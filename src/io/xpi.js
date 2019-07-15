import yauzl from 'yauzl';
import stripBomStream from 'strip-bom-stream';
import FirstChunkStream from 'first-chunk-stream';
import { oneLine } from 'common-tags';

import { IOBase } from 'io/base';
import log from 'logger';

/*
 * Simple Promise wrapper for the Yauzl unzipping lib to unpack add-on .xpis.
 * Note: We're using the autoclose feature of yauzl as a result every operation
 * will open the zip, do something and then close it implicitly.
 * This makes the API easy to use and the consumer doesn't need to remember to
 * close the zipfile.
 *
 */

export class Xpi extends IOBase {
  constructor(filePath, zipLib = yauzl) {
    super(filePath);
    this.zipLib = zipLib;
  }

  open() {
    return new Promise((resolve, reject) => {
      this.zipLib.open(this.path, (err, zipfile) => {
        if (err) {
          return reject(err);
        }
        return resolve(zipfile);
      });
    });
  }

  handleEntry(entry, reject) {
    if (/\/$/.test(entry.fileName)) {
      return;
    }
    if (!this.shouldScanFile(entry.fileName)) {
      log.debug(`Skipping file: ${entry.fileName}`);
      return;
    }
    if (this.entries.includes(entry.fileName)) {
      log.info('Found duplicate file entry: "%s" in package', entry.fileName);
      reject(
        new Error(oneLine`DuplicateZipEntry: Entry
        "${entry.fileName}" has already been seen`)
      );
      return;
    }
    this.entries.push(entry.fileName);
    this.files[entry.fileName] = entry;
  }

  async getFiles(_onEventsSubscribed) {
    // If we have already processed the file and have data
    // on this instance return that.
    if (Object.keys(this.files).length) {
      const wantedFiles = {};
      Object.keys(this.files).forEach((fileName) => {
        if (this.shouldScanFile(fileName)) {
          wantedFiles[fileName] = this.files[fileName];
        } else {
          log.debug(`Skipping cached file: ${fileName}`);
        }
      });
      return wantedFiles;
    }

    const zipfile = await this.open();

    return new Promise((resolve, reject) => {
      zipfile.on('entry', (entry) => {
        this.handleEntry(entry, reject);
      });

      // When the last entry has been processed
      // and the fd is closed resolve the promise.
      // Note: we cannot use 'end' here as 'end' is fired
      // after the last entry event is emitted and streams
      // may still be being read with openReadStream.
      zipfile.on('close', () => {
        resolve(this.files);
      });

      if (_onEventsSubscribed) {
        // Run optional callback when we know the event handlers
        // have been inited. Useful for testing.
        if (typeof _onEventsSubscribed === 'function') {
          Promise.resolve().then(() => _onEventsSubscribed());
        }
      }
    });
  }

  checkPath(path) {
    if (!Object.prototype.hasOwnProperty.call(this.files, path)) {
      throw new Error(`Path "${path}" does not exist in this XPI`);
    }

    if (this.files[path].uncompressedSize > this.maxSizeBytes) {
      throw new Error(`File "${path}" is too large. Aborting.`);
    }
  }

  async getFileAsStream(path) {
    this.checkPath(path);
    const zipfile = await this.open();
    return new Promise((resolve, reject) => {
      zipfile.openReadStream(this.files[path], (err, readStream) => {
        if (err) {
          return reject(err);
        }
        return resolve(readStream.pipe(stripBomStream()));
      });
    });
  }

  async getFileAsString(path) {
    const fileStream = await this.getFileAsStream(path);

    return new Promise((resolve, reject) => {
      let buf = Buffer.from('');
      fileStream.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
      });

      // Once the file is assembled, resolve the promise.
      fileStream.on('end', () => {
        const fileString = buf.toString('utf8');
        resolve(fileString);
      });

      fileStream.on('error', reject);
    });
  }

  async getChunkAsBuffer(path, chunkSize) {
    this.checkPath(path);
    const zipfile = await this.open();
    return new Promise((resolve, reject) => {
      zipfile.openReadStream(this.files[path], (err, readStream) => {
        if (err) {
          reject(err);
          return;
        }
        readStream.pipe(
          new FirstChunkStream({ chunkSize }, (_, enc) => {
            resolve(enc);
          })
        );
      });
    });
  }
}
