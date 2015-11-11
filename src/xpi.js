import yauzl from 'yauzl';
import { singleLineString } from 'utils';

import { ARCH_DEFAULT, ARCH_JETPACK } from 'const';
import { DuplicateZipEntryError } from 'exceptions';
import log from 'logger';


/*
 * Simple Promise wrapper for the Yauzl unzipping lib to unpack add-on .xpis.
 * Note: We're using the autoclose feature of yauzl as a result every operation
 * will open the zip, do something and then close it implicitly.
 * This makes the API easy to use and the consumer doesn't need to remember to
 * close the zipfile.
 *
 */

export default class Xpi {

  constructor(filename, zipLib=yauzl) {
    this.filename = filename;
    this.zipLib = zipLib;
    this.metadata = {
      architecture: ARCH_DEFAULT,
      files: {},
      _processed: false,
    };
    this.entries = [];
  }

  open() {
    return new Promise((resolve, reject) => {
      this.zipLib.open(this.filename, (err, zipfile) => {
        if (err) {
          return reject(err);
        }
        resolve(zipfile);
      });
    });
  }

  handleEntry(entry, reject) {
    if (/\/$/.test(entry.fileName)) {
      return;
    }
    if (this.entries.indexOf(entry.fileName) > -1) {
      log.info('Found duplicate file entry: "%s" in package', entry.fileName);
      reject(new DuplicateZipEntryError(
        `Entry "${entry.fileName}" has already been seen`));
    }
    this.entries.push(entry.fileName);
    this.metadata.files[entry.fileName] = entry;
  }

  getMetaData(_onEventsSubscribed) {
    return new Promise((resolve, reject) => {
      // If we have already processed the file and have data
      // on this instance return that.
      if (this.metadata._processed === true) {
        return resolve(this.metadata);
      }

      return this.open()
        .then((zipfile) => {

          zipfile.on('entry', (entry) => {
            this.handleEntry(entry, reject);
          });

          // When the last entry has been processed
          // and the fd is closed resolve the promise.
          // Note: we cannot use 'end' here as 'end' is fired
          // after the last entry event is emitted and streams
          // may still be being read with openReadStream.
          zipfile.on('close', () => {
            this.metadata._processed = true;

            // If we find a file named bootstrap.js this is assumed to be a
            // Jetpack add-on: https://github.com/mozilla/amo-validator/blob/7a8011aba8bf8c665aef2b51eb26d0697b3e19c3/validator/testcases/jetpack.py#L154
            // TODO: Check against file contents to make this more robust.
            if (this.entries.includes('bootstrap.js') && (
              this.entries.includes('harness-options.json') ||
              this.entries.includes('package.json')
            )) {
              this.metadata.architecture = ARCH_JETPACK;
            }

            resolve(this.metadata);
          });

          if (_onEventsSubscribed) {
            // Run optional callback when we know the event handlers
            // have been inited. Useful for testing.
            if (typeof _onEventsSubscribed === 'function') {
              _onEventsSubscribed();
            }
          }
        })
        .catch(reject);
    });
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

  getFileAsStream(path) {
    return new Promise((resolve, reject) => {

      if (!this.metadata.files.hasOwnProperty(path)) {
        throw new Error(`Path "${path}" does not exist in metadata`);
      }

      return this.open()
        .then((zipfile) => {
          var file = this.metadata.files[path];
          zipfile.openReadStream(file, (err, readStream) => {
            if (err) {
              return reject(err);
            }
            resolve(readStream);
          });
        })
        .catch(reject);
    });
  }

  getFileAsString(path) {
    return new Promise((resolve, reject) => {
      return this.getFileAsStream(path)
        .then((fileStream) => {
          var fileString = '';
          fileStream.on('data', (chunk) => {
            fileString += chunk;
          });

          // Once the file is assembled, resolve the promise.
          fileStream.on('end', () => {
            resolve(fileString);
          });
        })
        .catch(reject);
    });
  }

  getFilesByExt(...extensions) {
    return new Promise((resolve, reject) => {

      for (let ext of extensions) {
        if (ext.indexOf('.') !== 0) {
          throw new Error("File extension must start with '.'");
        }
      }

      return this.getMetaData()
        .then((metadata) => {
          let files = [];

          for (let filename in metadata.files) {
            for (let ext of extensions) {
              if (filename.endsWith(ext)) {
                files.push(filename);
              }
            }
          }
          resolve(files);
        })
        .catch(reject);
    });
  }
}
