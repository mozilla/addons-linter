import { default as Message } from 'message';
import * as constants from 'const';

// "I have a display case ready and waiting for our newest acquisitions!"
// --Taneleer Tivan


export default class Collector {

  constructor() {
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
    // Message will throw for incorrect types.
    // we have a test to ensure that is the case.
    var message = new _Message(type, opts);
    var list = this[`${type}s`];
    if (typeof list === 'undefined') {
      throw new Error(`Message type "${type}" not currently collected`);
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
