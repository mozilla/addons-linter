import { default as Message } from 'message';
import * as constants from 'const';

// "I have a display case ready and waiting for our newest acquisitions!"
// --Taneleer Tivan


export default class Collector {

  constructor(config = {}) {
    this.config = config;
    this.messagesByDataPath = {};
    this.scannedFiles = [];

    for (let type of constants.MESSAGE_TYPES) {
      this[`${type}s`] = [];
    }
  }

  get length() {
    var len = 0;
    for (let type of constants.MESSAGE_TYPES) {
      len += this[`${type}s`].length;
    }
    return len;
  }

  _addMessage(type, opts, _Message=Message) {
    // Filter the messages reported by file when the Linter has been configured
    // with a custom scanFile array using --scan-file CLI option.
    if (this.config.scanFile && opts.file) {
      if (!this.config.scanFile.some(v => v === opts.file)) {
        return;
      }
    }

    // Message will throw for incorrect types.
    // we have a test to ensure that is the case.
    var message = new _Message(type, opts);
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

  messagesAtDataPath(dataPath) {
    if (dataPath === undefined) {
      throw new Error('dataPath is required');
    }
    if (!this.messagesByDataPath[dataPath]) {
      this.messagesByDataPath[dataPath] = [];
    }
    return this.messagesByDataPath[dataPath];
  }

  _recordMessage(message, type) {
    if (message.dataPath) {
      this.messagesAtDataPath(message.dataPath).push(message);
    }
    this.messageList(type).push(message);
  }

  isDuplicateMessage(message) {
    if (message.dataPath) {
      var previousMessages = this.messagesAtDataPath(message.dataPath);
      return previousMessages.some((prevMessage) => {
        return prevMessage.matches(message);
      });
    }
    return false;
  }

  recordScannedFile(filename) {
    this.scannedFiles.push(filename);
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
