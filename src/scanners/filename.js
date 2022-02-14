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

    if (constants.ALREADY_SIGNED_REGEX.test(this.filename)) {
      this.linterMessages.push({
        ...messages.ALREADY_SIGNED,
        type: constants.VALIDATION_WARNING,
        file: this.filename,
      });
    } else if (constants.HIDDEN_FILE_REGEX.test(this.filename)) {
      this.linterMessages.push({
        ...messages.HIDDEN_FILE,
        type: constants.VALIDATION_WARNING,
        file: this.filename,
      });
    } else if (constants.FLAGGED_FILE_REGEX.test(this.filename)) {
      this.linterMessages.push({
        ...messages.FLAGGED_FILE,
        type: constants.VALIDATION_WARNING,
        file: this.filename,
      });
    } else if (constants.FLAGGED_FILE_EXTENSIONS.includes(extension)) {
      this.linterMessages.push({
        ...messages.FLAGGED_FILE_EXTENSION,
        type: constants.VALIDATION_WARNING,
        file: this.filename,
      });
    } else if (constants.RESERVED_FILENAMES.includes(filenameWithoutPath)) {
      this.linterMessages.push({
        ...messages.RESERVED_FILENAME,
        type: constants.VALIDATION_ERROR,
        file: this.filename,
      });
    } else {
      throw new Error(`Filename didn't match a regex: ${this.filename}.`);
    }
    return {
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    };
  }
}
