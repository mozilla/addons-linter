/* eslint  import/no-extraneous-dependencies: 0 */
import path from 'path';
import fs from 'fs';

import async from 'async';
import fetch from 'node-fetch';
import naturalCompare from 'natural-compare-lite';

import log from '../logger';
import createHash from './hasher';
import { urlFormat } from './utils';

const DEFAULT_PATH_TO_HASHES = path.join(__dirname, 'hashes.txt');
const DEFAULT_LIBRARY_FILE = path.join(__dirname, 'libraries.json');

// HACK: We use this global for now to store files inside the async queue.
let _files = [];

export default class Updater {
  constructor({
    _libraries = null,
    _pathToHashes = DEFAULT_PATH_TO_HASHES,
    libraryFile = DEFAULT_LIBRARY_FILE,
  } = {}) {
    this._cachedHashes = null;
    this._libraries = _libraries;
    this._pathToHashes = _pathToHashes;
    this.libraryFile = libraryFile;
    // This is needed for the test suite.
    _files = [];
  }

  run(_console = console) {
    return this.getLibraries()
      .then((libraries) => {
        return this.getFiles(libraries);
      })
      .then((libraries) => {
        return this.getHashes(libraries);
      })
      .then((libraries) => {
        return this.outputHashes(libraries);
      })
      .then((hashes) => {
        _console.log(hashes.join('\n'));
        return Promise.resolve(hashes);
      })
      .catch((err) => {
        _console.error('ERROR', err);

        throw err;
      });
  }

  getLibraries(_fs = fs) {
    if (this._libraries !== null) {
      return Promise.resolve(this._libraries);
    }

    try {
      const libraryJSON = _fs.readFileSync(this.libraryFile, {
        encoding: 'utf8',
      });
      this._libraries = JSON.parse(libraryJSON);
      return Promise.resolve(this._libraries);
    } catch (err) {
      if (err.toString().match(/^SyntaxError/)) {
        return Promise.reject(
          new Error(`JSONError: ${this.libraryFile} is not valid JSON.`)
        );
      }

      return Promise.reject(
        new Error(`${this.libraryFile} does not exist or is not a file.`)
      );
    }
  }

  _getAllFilesFromLibrary(library, index) {
    const files = [];

    for (const version of library.versions) {
      if (library.filename) {
        files.push({
          file: library.filename,
          fileOut: library.filenameOutput || library.filename,
          index,
          library,
          version,
          minified: false,
        });
      }

      if (library.filenameMinified) {
        files.push({
          file: library.filenameMinified,
          fileOut: library.filenameMinifiedOutput || library.filenameMinified,
          index,
          library,
          version,
          minified: true,
        });
      }
    }

    return files;
  }

  getFiles(libraries, referenceFiles = _files) {
    return new Promise((resolve) => {
      let files = [];
      const queue = async.queue(this._getFile.bind(this), 35);

      queue.drain(() => {
        log.debug('All downloads completed.');

        for (const file of referenceFiles) {
          if (
            file.index &&
            libraries[file.index] &&
            libraries[file.index].files
          ) {
            libraries[file.index].files.push(file);
          } else {
            throw new Error(`File or index not found: ${file}`);
          }
        }

        resolve(libraries);
      });

      for (const i in libraries) {
        if (Object.prototype.hasOwnProperty.call(libraries, i)) {
          const library = libraries[i];

          if (!library.files) {
            library.files = [];
          }

          files = files.concat(this._getAllFilesFromLibrary(library, i));
        }
      }

      queue.push(files);
    });
  }

  _buildDownloadURL(fileInfo) {
    let base = fileInfo.library.url;
    if (fileInfo.minified && fileInfo.library.urlMin) {
      base = fileInfo.library.urlMin;
    }
    return urlFormat(base, {
      filename: fileInfo.file,
      version: fileInfo.version,
    });
  }

  async _getFile(fileInfo, callback, _fetch = fetch) {
    const url = this._buildDownloadURL(fileInfo);
    log.debug(`Requesting ${url}`);

    let response;

    try {
      response = await _fetch(url);
    } catch (err) {
      log.error(`${url} encountered an error: ${err}.`);
      return callback(new Error(err));
    }

    if (response && response.status && response.status !== 200) {
      log.warn(`${url} produced code ${response.status}`);
      return callback(new Error(`ResponseError: ${response.status}`));
    }

    if (response && !response.status) {
      log.warn(`${url} has an invalid response code (${response.status})`);
      return callback(new Error(`InvalidResponseError: ${response.status}`));
    }

    const data = await response.text();
    log.debug(`Downloaded ${url}`);

    _files.push({
      contents: data,
      file: fileInfo.file,
      fileOut: fileInfo.fileOut,
      index: fileInfo.index,
      version: fileInfo.version,
    });

    return callback();
  }

  getHashes(libraries) {
    for (const library of libraries) {
      for (const file of library.files) {
        file.hash = createHash(file.contents);
      }
    }

    return Promise.resolve(libraries);
  }

  outputHashes(libraries) {
    return new Promise((resolve) => {
      const hashes = new Set();

      for (const hash of this._getCachedHashes()) {
        hashes.add(hash);
      }

      for (const hash of this._buildHashes(libraries)) {
        hashes.add(hash);
      }

      const hashesArray = Array.from(hashes).sort((a, b) => {
        // a, b look like "<HASH> <FILENAME>",
        // The regex finds the filename and uses it for natural sorting
        const getFileName = /\s+(.*)/;
        return naturalCompare(a.match(getFileName)[1], b.match(getFileName)[1]);
      });

      resolve(hashesArray);
    });
  }

  _buildHashes(libraries) {
    const hashes = new Set();

    for (const library of libraries) {
      for (const file of library.files) {
        const hashString = `${file.hash} ${library.name}.${file.version}.${file.fileOut}`;
        hashes.add(hashString);
      }
    }

    return Array.from(hashes);
  }

  _getCachedHashes() {
    const hashes = fs.readFileSync(this._pathToHashes, { encoding: 'utf8' });

    return hashes.split('\n').filter((value) => {
      return value && value.length > 0 && value.substr(0, 1) !== '#';
    });
  }
}
