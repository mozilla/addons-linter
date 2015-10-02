export class ExtensibleError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = this.constructor.name;
    if (Error.hasOwnProperty('captureStackTrace')) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
  }
}

export class DuplicateZipEntryError extends ExtensibleError {}

