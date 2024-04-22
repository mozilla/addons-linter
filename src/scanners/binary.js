import BaseScanner from 'scanners/base';
import * as messages from 'messages';
import * as constants from 'const';

export default class BinaryScanner extends BaseScanner {
  static get fileResultType() {
    return 'chunk';
  }

  static get scannerName() {
    return 'binary';
  }

  check(buffer, values) {
    if (Object.keys(values).some((v) => values[v] !== buffer[v])) {
      return;
    }

    this.linterMessages.push({
      ...messages.FLAGGED_FILE_TYPE,
      type: constants.VALIDATION_NOTICE,
      file: this.filename,
    });
  }

  async scan() {
    const buffer = this.contents;
    constants.FLAGGED_FILE_MAGIC_NUMBERS.forEach((entry) => {
      this.check(buffer, entry);
    });

    return {
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    };
  }
}
