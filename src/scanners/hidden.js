import BaseScanner from 'scanners/base';
import { HIDDEN_FILE } from 'messages';
import { VALIDATION_WARNING } from 'const';


export default class HiddenScanner extends BaseScanner {
  scan() {
    return new Promise((resolve) => {
      this.linterMessages.push(
        Object.assign({}, HIDDEN_FILE, {
          type: VALIDATION_WARNING,
          file: this.filename,
        })
      );
      return resolve(this.linterMessages);
    });
  }
}
