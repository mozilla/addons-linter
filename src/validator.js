import * as fs from 'fs';

import promisify from 'es6-promisify';
import chalk from 'chalk';

import * as messages from 'messages';
import * as exceptions from 'exceptions';
import * as constants from 'const';

import Xpi from 'xpi';
import Collector from 'collector';

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

  toJSON(pretty=false) {
    var args = [this.output];
    if (pretty === true) {
      args.push(null);
      args.push(4);
    }
    return JSON.stringify.apply(null, args);
  }

  scan(_Xpi=Xpi) {
    return this.checkFileExists(this.packagePath)
      .then(() => {
        this.xpi = new _Xpi(this.packagePath);
        return this.xpi.getMetaData();
      })
      .then((metadata) => {
        // Do something useful with package here.
        console.log(metadata);
      })
      .catch((err) => {
        if (err instanceof exceptions.DuplicateZipEntryError) {
          this.collector.addError(messages.DUPLICATE_XPI_ENTRY);
          this.print();
        } else {
          return this.handleError(err);
        }
      });
  }
}
