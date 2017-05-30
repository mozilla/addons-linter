import BaseScanner from 'scanners/base';
import * as messages from 'messages';
import * as constants from 'const';


export default class BinaryScanner extends BaseScanner {
  static get fileStreamType() {
    return 'chunk';
  }

  static get scannerName() {
    return 'binary';
  }

  check(buffer, values) {
    for (let v in values) {
      if (values[v] !== buffer[v]) {
        return;
      }
    }
    this.linterMessages.push(
      Object.assign({}, messages.FLAGGED_FILE_TYPE, {
        type: constants.VALIDATION_NOTICE,
        file: this.filename,
      })
    );
  }

  scan() {
    var buffer = this.contents;
    for (let entry of constants.FLAGGED_FILE_MAGIC_NUMBERS) {
      this.check(buffer, entry);
    }

    return Promise.resolve({
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    });
  }
}
