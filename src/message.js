import { oneLine } from 'common-tags';

import { MESSAGE_TYPES } from 'const';

// These are the props we expect to pull out of
// the data object passed to the Message constructor.
export const props = [
  'code',
  'message',
  'description',
  'column',
  'file',
  'line',
  'instancePath',
];

export const requiredProps = ['code', 'message', 'description'];

export default class Message {
  constructor(type, data = {}) {
    this.type = type;

    if (Object.prototype.hasOwnProperty.call(data, 'filename')) {
      throw new Error('The key for the file is "file" not "filename"');
    }

    props.forEach((prop) => {
      this[prop] = data[prop];
    });
    const missingProps = [];
    requiredProps.forEach((prop) => {
      if (typeof this[prop] === 'undefined') {
        missingProps.push(prop);
      }
    });
    if (missingProps.length) {
      throw new Error(oneLine`Message data object is missing the
        following props: ${missingProps.join(', ')}`);
    }
  }

  get type() {
    return this._type;
  }

  set type(type) {
    if (!MESSAGE_TYPES.includes(type)) {
      throw new Error(oneLine`Message type "${type}"
        is not one of ${MESSAGE_TYPES.join(', ')}`);
    }
    this._type = type;
  }

  matches(other) {
    return (
      this.type === other.type &&
      props.every((prop) => {
        return this[prop] === other[prop];
      })
    );
  }
}
