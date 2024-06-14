import { ensureFilenameExists, ignorePrivateFunctions } from 'utils';

export default class BaseScanner {
  static get fileResultType() {
    /*
    Because each scanner expects a certain kind of data from the
    io libraries, a string or stream for example, we'll let the
    scanner define the type of data it expects. Most default to
    string.

    This can be overridden on the class.

    Because contents is passed to the constructor, we need to be
    able to access this before the constructor.
    */
    return 'string';
  }

  static get scannerName() {
    /*
    Each scanner has a unique name that identifies it. This value is currently
    being used to organize scanned files and report them.

    This must be overriden on the class.
    */

    throw new Error('scannerName is not implemented');
  }

  /**
   * @typedef {Object} ScannerOptions
   * @property {import('../parsers/manifestjson').Metadata} addonMetadata
   * @property {import('../collector').default} collector
   * @property {string[]} disabledRules
   * @property {boolean} enterprise
   * @property {string[]} existingFiles
   * @property {boolean} privileged
   *
   * @param {string|Buffer|import('stream').Readable} contents
   * @param {string} filename
   * @param {ScannerOptions} options
   */
  constructor(contents, filename, options = {}) {
    this.contents = contents;
    this.filename = filename;
    this.options = options;
    this.linterMessages = [];
    this.scannedFiles = [];
    this._defaultRules = [];
    this._parsedContent = null;
    this._rulesProcessed = 0;

    ensureFilenameExists(this.filename);
  }

  async scan(_rules = this._defaultRules) {
    const contents = await this.getContents();
    // Ignore private functions exported in rule files.
    //
    // (These are exported for testing purposes, but we don't want
    // to include them in our linter's rules.)
    const rules = ignorePrivateFunctions(_rules);

    const ruleResults = await Promise.all(
      Object.keys(rules).map((rule) => {
        this._rulesProcessed++;
        return rules[rule](contents, this.filename, this.options);
      })
    );

    ruleResults.forEach((messages) => {
      this.linterMessages = this.linterMessages.concat(messages);
    });

    return {
      linterMessages: this.linterMessages,
      scannedFiles: [this.filename],
    };
  }

  async getContents() {
    if (this._parsedContent !== null) {
      return this._parsedContent;
    }
    this._parsedContent = await this._getContents();
    return this._parsedContent;
  }

  async _getContents() {
    throw new Error('_getContents is not implemented');
  }
}
