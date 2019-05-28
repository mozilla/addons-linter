import { extname, basename } from 'path';

import BaseScanner from 'scanners/base';
import * as messages from 'messages';
import * as constants from 'const';

export default class FilenameScanner extends BaseScanner {
  static get scannerName() {
    return 'filename';
  }

  async scan() {
    const extension = extname(this.filename);
    const filenameWithoutPath = basename(this.filename);

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
    } else if (constants.RESERVED_FILENAMES.includes(filenameWithoutPath)) {
      this.linterMessages.push(
        Object.assign({}, messages.RESERVED_FILENAME_DETECTED, {
          type: constants.VALIDATION_ERROR,
          file: this.filename,
        })
      );
    } else {
      throw new Error(`Filename didn't match a regex: ${this.filename}.`);
    }
    return {
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    };
  }
}
