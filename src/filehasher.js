import fs from 'fs';
import readline from 'readline';

import createHash from 'sha.js';

import log from 'logger';
import { lstatPromise } from 'io/utils';


export default class FileHasher {

  constructor({hashes=null, path='./src/hashes.txt', lstat=lstatPromise} = {}) {
    this._hashes = hashes;
    this._lstatPromise = lstat;
    this._pathToHashes = path;
  }

  getHashes() {
    if (this._hashes) {
      log.debug('Hashes already loaded; skipping file lookup.');
      return Promise.resolve(this._hashes);
    }

    return this._loadHashesFromFile();
  }

  matchesJSLibrary(fileContents) {
    return this.getHashes()
      .then((hashes) => {
        var hash = this._makeHash(fileContents);

        if (Object.keys(hashes).includes(hash)) {
          return {
            matches: true,
            name: hashes[hash],
          };
        } else {
          return {
            matches: false,
            name: null,
          };
        }
      });
  }

  _loadHashesFromFile(path=this._pathToHashes) {
    var invalidMessage = new Error(
      `Path "${path}" is not a file or does not exist.`);

    log.debug(`Attempting to load hashes from ${path}.`);

    return new Promise((resolve, reject) => {
      this._lstatPromise(path)
        .then((stats) => {
          if (stats.isFile() !== true) {
            return reject(invalidMessage);
          }

          var hashes = {};
          var hashFile = readline.createInterface({
            input: fs.createReadStream(path),
          });

          hashFile.on('line', (line) => {
            var hash = line.split(' ')[0];
            var name = line.split(' ')[1];
            hashes[hash] = name;
          });

          hashFile.on('close', () => {
            log.debug(`Loaded ${Object.keys(hashes).length} hashes.`);
            this._hashes = hashes;

            resolve(hashes);
          });
        })
        .catch((err) => {
          if (err.code !== 'ENOENT') {
            reject(err);
          } else {
            reject(invalidMessage);
          }
        });
    });
  }

  _makeHash(string) {
    return createHash('sha256').update(string, 'utf8').digest('hex');
  }
}
