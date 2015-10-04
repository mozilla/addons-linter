import * as fs from 'fs';

import promisify from 'es6-promisify';
import chalk from 'chalk';

import * as messages from 'messages';
import * as exceptions from 'exceptions';
import * as constants from 'const';

import JavaScriptScanner from 'javascript';
import Collector from 'collector';
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

  addToCollector(message) {
    var messageType = message.severity.charAt(0).toUpperCase() +
                      message.severity.slice(1);
    this.collector[`add${messageType}`](message);
  }

  handleError(err) {
    if (this.config.stack === true) {
      console.error(err.stack);
    } else {
      console.error(this.chalk.red(err.message || err));
    }
  }

  print() {
    if (this.config.output === 'json') {
      console.log(this.toJSON(this.config.pretty));
    } else {
      console.log('Text output not yet implemented!');
    }
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

  scan(_Xpi=Xpi) {
    return new Promise((resolve, reject) => {
      this.checkFileExists(this.packagePath)
        .then(() => {
          this.xpi = new _Xpi(this.packagePath);
          return this.xpi.getJSFiles();
        })
        .then((jsFiles) => {
          return this.scanJSFiles(jsFiles);
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

  scanJSFiles(jsFiles) {
    return new Promise((resolve, reject) => {
      // Resolve once every file in the XPI has been checked.
      var jsFilesPromises = [];

      for (let filename of jsFiles) {
        jsFilesPromises.push(this.scanJSFile(filename));
      }

      return Promise.all(jsFilesPromises)
        .then(() => {
          resolve(this.collector);
        }).catch(reject);
    });
  }

  scanJSFile(filename) {
    return new Promise((resolve, reject) => {
      this.xpi.getFileAsString(filename)
        .then((code) => {
          let jsScanner = new JavaScriptScanner(code, filename);
          return jsScanner.scan();
        })
        .then((validatorMessages) => {
          for (let message of validatorMessages) {
            this.addToCollector(message);
          }

          resolve();
        })
        .catch(reject);
    });
  }

  toJSON(pretty=false) {
    var args = [this.output];
    if (pretty === true) {
      args.push(null);
      args.push(4);
    }
    return JSON.stringify.apply(null, args);
  }
}
