import { MESSAGE_TYPES, SIGNING_SEVERITIES } from 'const';


// These are the optional fields we expect to pull out of
// the opts object passed to the Message constructor.
export var fields = [
  'id',
  'message',
  'description',
  'file',
  'line',
  'column',
  'for_appversions',
  'compatibility_type',
  'signing_help',
  'signing_severity',
];


export default class Message {

  constructor(type, opts={}) {
    this.type = type;
    for (let field of fields) {
      this[field] = opts[field];
    }
    this.editorsOnly = opts.editorsOnly || false;
  }

  get type() {
    return this._type;
  }

  set type(type) {
    if (MESSAGE_TYPES.indexOf(type) === -1) {
      throw new Error(
        `Message type "${type}" is not one of ${MESSAGE_TYPES.join(', ')}`);
    }
    this._type = type;
  }

  get signing_severity() {
    return this._signing_severity;
  }

  set signing_severity(severity) {
    if (typeof severity !== 'undefined') {
      if (SIGNING_SEVERITIES.indexOf(severity) === -1) {
        throw new Error(
          `Severity "${severity}" is not one of ` +
          `${SIGNING_SEVERITIES.join(', ')}`);
      }
    }
    this._signing_severity = severity;
  }
}
