import fs from 'fs';

import { promisify } from 'es6-promisify';
import yauzl from 'yauzl';

import log from 'logger';

import { Xpi } from './xpi';

async function parseCRX(buffer) {
  if (buffer.readUInt32BE(0) !== 0x43723234) {
    throw new Error('Invalid header: Does not start with Cr24.');
  }

  const version = buffer.readUInt32LE(4);

  if (version === 2) {
    const publicKeyLength = buffer.readUInt32LE(8);
    const signatureLength = buffer.readUInt32LE(12);
    // 16 = Magic number (4), CRX format version (4), lengths (2x4)
    return buffer.slice(16 + publicKeyLength + signatureLength);
  }

  if (version === 3) {
    const crx3HeaderLength = buffer.readUInt32LE(8);
    // 12 = Magic number (4), CRX format version (4), header length (4)
    return buffer.slice(12 + crx3HeaderLength);
  }

  throw new Error('Unexpected crx format version number.');
}

/*
 * A CRX file is just a ZIP file (eg an XPI) with some extra header
 * information. So we handle opening the file with a CRX parser, then treat
 * it like an XPI after that.
 *
 */
export class Crx extends Xpi {
  constructor(filePath, zipLib = yauzl, _parseCRX = parseCRX, _fs = fs) {
    super(filePath, zipLib);
    this.fs = _fs;
    this.parseCRX = _parseCRX;
  }

  async open() {
    let buffer = await promisify(this.fs.readFile)(this.path);

    // Parse out the CRX header data from the actual ZIP contents.
    buffer = await this.parseCRX(buffer);

    log.debug('Obtained zip data from CRX file', buffer);

    // Finally we can read in the zip data as a buffer into yauzl.
    return promisify(this.zipLib.fromBuffer)(buffer);
  }

  async getFiles(_onEventsSubscribed) {
    // If we have already processed the file and have data
    // on this instance return that.
    if (Object.keys(this.files).length) {
      return this.files;
    }

    const zipfile = await this.open();

    // We use the 'end' event here because we're reading the CRX in
    // from a buffer (because we have to unpack the header info from it
    // first). The 'close' event is never fired when using yauzl's
    // `fromBuffer()` method.
    return new Promise((resolve, reject) => {
      zipfile.on('entry', (entry) => {
        this.handleEntry(entry, reject);
      });

      zipfile.on('end', () => {
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
}
