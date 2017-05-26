import { extname } from 'path';

import BaseScanner from 'scanners/base';
import * as messages from 'messages';
import * as constants from 'const';


export default class FilenameScanner extends BaseScanner {
  static get scannerName() {
    return 'filename';
  }

  scan() {
    return new Promise((resolve) => {
      const extension = extname(this.filename);

      if (this.filename.match(constants.ALREADY_SIGNED_REGEX)) {
        this.linterMessages.push(
          Object.assign({}, messages.ALREADY_SIGNED, {
            type: constants.VALIDATION_WARNING,
            file: this.filename,
          })
        );
      } else if (this.filename.match(constants.HIDDEN_FILE_REGEX)) {
        this.linterMessages.push(
          Object.assign({}, messages.HIDDEN_FILE, {
            type: constants.VALIDATION_WARNING,
            file: this.filename,
          })
        );
      } else if (this.filename.match(constants.FLAGGED_FILE_REGEX)) {
        this.linterMessages.push(
          Object.assign({}, messages.FLAGGED_FILE, {
            type: constants.VALIDATION_WARNING,
            file: this.filename,
          })
        );
      } else if (constants.FLAGGED_FILE_EXTENSIONS.includes(extension)) {
        this.linterMessages.push(
          Object.assign({}, messages.FLAGGED_FILE_EXTENSION, {
            type: constants.VALIDATION_WARNING,
            file: this.filename,
          })
        );
      } else {
        throw new Error(`Filename didn't match a regex: ${this.filename}.`);
      }
      return resolve({
        linterMessages: this.linterMessages,
        scannedFiles: this.scannedFiles,
      });
    });
  }
}
