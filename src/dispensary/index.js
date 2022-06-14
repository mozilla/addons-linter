// The entire content of hashes.txt will be part of the addons-linter.js
// bundle.
import HASHES from 'dispensary/hashes.txt';
import createHash from 'dispensary/hasher';

export default class Dispensary {
  constructor() {
    this._cachedHashes = null;
  }

  // Matches only against cached hashes; this is the API external apps and
  // libraries would use.
  match(contents) {
    if (this._cachedHashes === null) {
      this._cachedHashes = {};

      this._getCachedHashes().forEach((hashEntry) => {
       const [hash, library] = hashEntry.split(/\s+/);

       this._cachedHashes[hash] = library;
     });
    }

    const contentsHash = createHash(contents);

    if (
      Object.prototype.hasOwnProperty.call(this._cachedHashes, contentsHash)
    ) {
      return this._cachedHashes[contentsHash];
    }

    return false;
  }

  _getCachedHashes() {
    return HASHES.split('\n').filter((value) => {
      return value && value.length > 0 && value.substr(0, 1) !== '#';
    });
  }
}
