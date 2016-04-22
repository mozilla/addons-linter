import BaseScanner from 'scanners/base';
import log from 'logger';

export default class NullScanner extends BaseScanner {
  scan() {
    return new Promise((resolve) => {
      log.debug(`No scanner found for: ${this.filename}.`);
      return resolve([]);
    });
  }
}
