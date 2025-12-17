import upath from 'upath';

import { default as Message } from 'message';
import * as constants from 'const';

// "I have a display case ready and waiting for our newest acquisitions!"
// --Taneleer Tivan

export default class Collector {
  constructor(config = {}) {
    this.config = config;
    this.messagesByInstancePath = {};
    this.scannedFiles = {};

    constants.MESSAGE_TYPES.forEach((type) => {
      this[`${type}s`] = [];
    });
  }

  get length() {
    let len = 0;
    constants.MESSAGE_TYPES.forEach((type) => {
      len += this[`${type}s`].length;
    });
    return len;
  }

  _addMessage(type, opts, _Message = Message) {
    // Message will throw for incorrect types.
    // we have a test to ensure that is the case.
    const message = new _Message(type, opts);
    if (typeof this.messageList(type) === 'undefined') {
      throw new Error(`Message type "${type}" not currently collected`);
    }

    if (!this.isDuplicateMessage(message)) {
      this._recordMessage(message, type);
    }
  }

  messageList(type) {
    return this[`${type}s`];
  }

  messagesAtInstancePath(instancePath) {
    if (instancePath === undefined) {
      throw new Error('instancePath is required');
    }
    if (!this.messagesByInstancePath[instancePath]) {
      this.messagesByInstancePath[instancePath] = [];
    }
    return this.messagesByInstancePath[instancePath];
  }

  _recordMessage(message, type) {
    if (message.instancePath) {
      this.messagesAtInstancePath(message.instancePath).push(message);
    }
    this.messageList(type).push(message);
  }

  isDuplicateMessage(message) {
    if (message.instancePath) {
      const previousMessages = this.messagesAtInstancePath(
        message.instancePath
      );
      if (message.file === 'manifest.json') {
        return previousMessages.some(
          (prevMessage) => prevMessage.code === message.code
        );
      }
      return previousMessages.some((prevMessage) =>
        prevMessage.matches(message)
      );
    }
    return false;
  }

  recordScannedFile(originalFilename, scanner) {
    // Convert filename to unix path separator before
    // storing it into the scanned files.
    const filename = upath.toUnix(originalFilename);

    // TODO: Add some code that verifies and normalizes `filename`
    // to better avoid duplicates.
    // See https://github.com/mozilla/addons-linter/issues/1310
    if (filename in this.scannedFiles) {
      if (!this.scannedFiles[filename].includes(scanner)) {
        this.scannedFiles[filename].push(scanner);
      }
    } else {
      this.scannedFiles[filename] = [scanner];
    }
  }

  addError(opts) {
    this._addMessage(constants.VALIDATION_ERROR, opts);
  }

  addNotice(opts) {
    this._addMessage(constants.VALIDATION_NOTICE, opts);
  }

  addWarning(opts) {
    this._addMessage(constants.VALIDATION_WARNING, opts);
  }
}
