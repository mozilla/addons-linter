import fs from 'fs';

import parseCRX from 'crx-parser';
import yauzl from 'yauzl';

import log from 'logger';
import { Xpi } from './xpi';


/*
 * A CRX file is just a ZIP file (eg an XPI) with some extra header
 * information. So we handle opening the file with a CRX parser, then treat
 * it like an XPI after that.
 *
 */
export class Crx extends Xpi {

  constructor(filePath, zipLib=yauzl, _parseCRX=parseCRX, _fs=fs) {
    super(filePath, zipLib);
    this.fs = _fs;
    this.parseCRX = _parseCRX;
  }

  open() {
    return new Promise((resolve, reject) => {
      // First, read the file manually, as we need to pass the whole thing
      // to crx-parser.
      this.fs.readFile(this.path, (err, buffer) => {
        if (err) {
          return reject(err);
        }
        // Parse out the CRX header data from the actual ZIP contents.
        this.parseCRX(buffer, (err, data) => {
          if (err) {
            return reject(err);
          }

          log.debug('Obtained zip data from CRX file', data);
          // Finally we can read in the zip data as a buffer into yauzl.
          this.zipLib.fromBuffer(data.body, (err, zipFile) => {
            if (err) {
              return reject(err);
            }

            resolve(zipFile);
          });
        });
      });
    });
  }

  getFiles(_onEventsSubscribed) {
    return new Promise((resolve, reject) => {
      // If we have already processed the file and have data
      // on this instance return that.
      if (Object.keys(this.files).length) {
        return resolve(this.files);
      }

      return this.open()
        .then((zipfile) => {

          zipfile.on('entry', (entry) => {
            this.handleEntry(entry, reject);
          });

          // We use the 'end' event here because we're reading the CRX in
          // from a buffer (because we have to unpack the header info from it
          // first). The 'close' event is never fired when using yauzl's
          // `fromBuffer()` method.
          zipfile.on('end', () => {
            resolve(this.files);
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
}
