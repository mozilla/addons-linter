import { default as Message } from 'message';
import * as constants from 'const';

// "I have a display case ready and waiting for our newest acquisitions!"
// --Taneleer Tivan


export default class Collector {

  constructor(config = {}) {
    this.config = config;
    this.messageIndices = {};

    for (let type of constants.MESSAGE_TYPES) {
      this[`${type}s`] = [];
      this.messageIndices[`${type}s`] = {};
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
    var list = this[`${type}s`];
    if (typeof list === 'undefined') {
      throw new Error(`Message type "${type}" not currently collected`);
    }

    // Limit messages to one per dataPath per message type.
    //
    // Also, prioritise messages that are not about additionalProperties
    // since a type or format error is generally more helpful.
    var previousMessages = this.messageIndices[`${type}s`];
    var previousMessageIndex = previousMessages[message.dataPath];
    // Compare with undefined since previousMessageIndex can be 0.
    if (message.dataPath && previousMessageIndex !== undefined) {
      var previousMessage = list[previousMessageIndex];
      if (previousMessage.keyword === 'additionalProperties') {
        // This should be more informative, overwrite the old message.
        list[previousMessageIndex] = message;
        return;
      }
      // Skip this message, we only want one per dataPath.
      return;
    }
    // Store the index so we can look it up if we get the same dataPath later.
    if (message.dataPath) {
      previousMessages[message.dataPath] = list.length;
    }

    list.push(message);
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
