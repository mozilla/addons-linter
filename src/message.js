import { MESSAGE_TYPES } from 'const';
import { singleLineString } from 'utils';


// These are the props we expect to pull out of
// the data object passed to the Message constructor.
export var props = [
  'code',
  'message',
  'description',
  'column',
  'file',
  'line',
];

export var requiredProps = [
  'code',
  'message',
  'description',
];

export default class Message {

  constructor(type, data={}) {
    this.type = type;

    if (data.hasOwnProperty('filename')) {
      throw new Error('The key for the file is "file" not "filename"');
    }

    for (let prop of props) {
      this[prop] = data[prop];
    }
    var missingProps = [];
    for (let prop of requiredProps) {
      if (typeof this[prop] === 'undefined') {
        missingProps.push(prop);
      }
    }
    if (missingProps.length) {
      throw new Error(singleLineString`Message data object is missing the
        following props: ${missingProps.join(', ')}`);
    }
  }

  get type() {
    return this._type;
  }

  set type(type) {
    if (!MESSAGE_TYPES.includes(type)) {
      throw new Error(singleLineString`Message type "${type}"
        is not one of ${MESSAGE_TYPES.join(', ')}`);
    }
    this._type = type;
  }

}
