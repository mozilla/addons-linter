import { default as Message } from 'message';

// "I have a display case ready and waiting for our newest acquisitions!"
// --Taneleer Tivan


export default class Collector {

  constructor() {
    this.errors = [];
    this.notices = [];
    this.warnings = [];
  }

  get length() {
    return this.errors.length +
      this.notices.length +
      this.warnings.length;
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
    this._addMessage('error', opts);
  }

  addNotice(opts) {
    this._addMessage('notice', opts);
  }

  addWarning(opts) {
    this._addMessage('warning', opts);
  }
}
