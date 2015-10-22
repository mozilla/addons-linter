export class ExtensibleError extends Error {
  constructor(message, _Error=Error) {
    super();
    this.message = message;
    this.name = this.constructor.name;
    if (_Error.hasOwnProperty('captureStackTrace')) {
      _Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new _Error()).stack;
    }
  }
}

export class DuplicateZipEntryError extends ExtensibleError {}

export class RDFParseError extends ExtensibleError {}

export class NotImplentedError extends ExtensibleError {}
