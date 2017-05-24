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

  constructor(contents, filename, options={}) {
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

  scan(_rules=this._defaultRules) {
    return new Promise((resolve, reject) => {
      this.getContents()
        .then((contents) => {
          var promises = [];
          // Ignore private functions exported in rule files.
          //
          // (These are exported for testing purposes, but we don't want
          // to include them in our linter's rules.)
          var rules = ignorePrivateFunctions(_rules);

          for (let rule in rules) {
            this._rulesProcessed++;

            promises.push(rules[rule](contents, this.filename,
                                      this.options));
          }

          return Promise.all(promises);
        })
        .then((ruleResults) => {
          for (let messages of ruleResults) {
            this.linterMessages = this.linterMessages.concat(messages);
          }

          resolve({
            messages: this.linterMessages,
            scannedFiles: this.scannedFiles,
          });
        })
        .catch(reject);
    });
  }

  getContents() {
    return new Promise((resolve, reject) => {
      if (this._parsedContent !== null) {
        return resolve(this._parsedContent);
      }

      this._getContents()
        .then((contents) => {
          this._parsedContent = contents;

          resolve(this._parsedContent);
        })
        .catch(reject);
    });
  }

  _getContents() {
    return Promise.reject(
      new Error('_getContents is not implemented'));
  }

}
