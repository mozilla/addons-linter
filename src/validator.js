import { extname } from 'path';
import * as fs from 'fs';

import columnify from 'columnify';
import chalk from 'chalk';
import promisify from 'es6-promisify';

import * as constants from 'const';
import * as exceptions from 'exceptions';
import * as messages from 'messages';
import { checkMinNodeVersion, gettext as _, singleLineString } from 'utils';

import Collector from 'collector';
import CSSScanner from 'validators/css';
import JavaScriptScanner from 'validators/javascript';
import RDFScanner from 'validators/rdf';
import Xpi from 'xpi';

export var lstat = promisify(fs.lstat);


export default class Validator {

  constructor(config) {
    this.config = config;
    this.packagePath = config._[0];
    this.xpi;
    this.chalk = new chalk.constructor(
      {enabled: !this.config.boring});
    this.collector = new Collector();
  }

  colorize(type) {
    switch (type) {
      case constants.VALIDATION_ERROR:
        return this.chalk.red;
      case constants.VALIDATION_WARNING:
        return this.chalk.yellow;
      case constants.VALIDATION_NOTICE:
        return this.chalk.blue;
      default:
        throw new Error(singleLineString`colorize passed invalid type.
          Should be one of ${constants.MESSAGE_TYPES.join(', ')}`);
    }
  }

  handleError(err, _console=console) {
    if (this.config.stack === true) {
      _console.error(err.stack);
    } else {
      _console.error(this.chalk.red(err.message || err));
    }
  }

  print(_console=console) {
    if (this.config.output === 'json') {
      _console.log(this.toJSON(this.config.pretty));
    } else {
      _console.log(this.textOutput());
    }
  }

  toJSON(pretty=false, _JSON=JSON) {
    var args = [this.output];
    if (pretty === true) {
      args.push(null);
      args.push(4);
    }
    return _JSON.stringify.apply(null, args);
  }

  textOutput() {
    var out = [];

    out.push(_('Validation Summary:'));
    out.push('');
    out.push(columnify(this.output.summary, {
      showHeaders: false,
      minWidth: 15,
    }));
    out.push('');

    for (let type of constants.MESSAGE_TYPES) {
      var messageType = `${type}s`;
      if (this.output[messageType].length) {
        out.push(`${messageType.toUpperCase()}:`);
        out.push('');
        out.push(columnify(this.output[messageType], {
          maxWidth: 35,
          columns: ['code', 'message', 'description', 'file', 'line', 'column'],
          columnSplitter: '   ',
          config: {
            code: {
              dataTransform: (value) => {
                return this.colorize(type)(value);
              },
              headingTransform: () => {
                return _('Code');
              },
              maxWidth: 25,
            },
            message: {
              headingTransform: () => {
                return _('Message');
              },
              maxWidth: 30,
            },
            description: {
              headingTransform: () => {
                return _('Description');
              },
              maxWidth: 40,
            },
            file: {
              headingTransform: () => {
                return _('File');
              },
            },
            line: {
              headingTransform: () => {
                return _('Line');
              },
            },
            column: {
              headingTransform: () => {
                return _('Column');
              },
            },
          },
        }));
      }
    }
    return out.join('\n');
  }

  get output() {
    var output = {
      count: this.collector.length,
      summary: {},
    };
    for (let type of constants.MESSAGE_TYPES) {
      var messageType = `${type}s`;
      output[messageType] = this.collector[messageType];
      output.summary[messageType] = this.collector[messageType].length;
    }
    return output;
  }

  checkFileExists(filepath, _lstat=lstat) {
    var invalidMessage = new Error(
      `Path "${filepath}" is not a file or does not exist.`);
    return new Promise((resolve, reject) => {
      return _lstat(filepath)
        .then((stats) => {
          if (stats.isFile() === true) {
            resolve();
          } else {
            reject(invalidMessage);
          }
        })
        .catch((err) => {
          if (err.code !== 'ENOENT') {
            reject(err);
          } else {
            reject(invalidMessage);
          }
        });
    });
  }

  scanFiles(files) {
    return new Promise((resolve, reject) => {
      // Resolve once every file in the XPI has been checked.
      var promises = [];
      for (let filename of files) {
        promises.push(this.scanFile(filename));
      }
      return Promise.all(promises)
        .then(() => {
          resolve();
        }).catch(reject);
    });
  }

  getScanner(filename) {
    switch (extname(filename)) {
      case '.css':
        return CSSScanner;
      case '.js':
        return JavaScriptScanner;
      case '.rdf':
        return RDFScanner;
      default:
        throw new Error('No scanner available for ${filename}');
    }
  }

  scanFile(filename) {
    return new Promise((resolve, reject) => {
      // We might have to refactor this if we need to
      // deal with streams *and* strings. But let's wait until that
      // point comes. So far it seems most valiators want strings.
      this.xpi.getFileAsString(filename)
        .then((code) => {
          let scanner = new (this.getScanner(filename))(code, filename);
          return scanner.scan();
        })
        // messages should be a list of raw message data objects.
        .then((messages) => {
          for (let message of messages) {
            if (typeof message.type === 'undefined') {
              throw new Error('message.type must be defined');
            }
            this.collector._addMessage(message.type, message);
          }
          resolve();
        })
        .catch(reject);
    });
  }

  scan(_Xpi=Xpi) {
    return new Promise((resolve, reject) => {
      checkMinNodeVersion()
        .then(() => {
          return this.checkFileExists(this.packagePath);
        })
        .then(() => {
          this.xpi = new _Xpi(this.packagePath);
          return this.xpi.getFilesByExt('.js');
        })
        .then((jsFiles) => {
          return this.scanFiles(jsFiles);
        })
        .then(() => {
          return this.xpi.getFilesByExt('.rdf');
        })
        .then((rdfFiles) => {
          return this.scanFiles(rdfFiles);
        })
        .then(() => {
          return this.xpi.getFilesByExt('.css');
        })
        .then((cssFiles) => {
          return this.scanFiles(cssFiles);
        })
        .then(() => {
          this.print();
          resolve();
        })
        .catch((err) => {
          if (err instanceof exceptions.DuplicateZipEntryError) {
            this.collector.addError(messages.DUPLICATE_XPI_ENTRY);
            this.print();
          } else {
            this.handleError(err);
          }
          reject(err);
        });
    });
  }
}
