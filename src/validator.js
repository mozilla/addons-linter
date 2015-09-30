import * as fs from 'fs';
import Xpi from  'xpi';

import promisify from 'es6-promisify';
import chalk from 'chalk';

export var lstat = promisify(fs.lstat);


export default class Validator {

  constructor(config) {
    this.config = config;
    this.packagePath = config._[0];
    this.xpi;
    this.chalk = new chalk.constructor(
      {enabled: !this.config.boring});
  }

  handleError(err) {
    if (this.config.stack === true) {
      console.error(err.stack);
    } else {
      console.error(this.chalk.red(err.message || err));
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
        .catch(err => {
          if (err.code !== 'ENOENT') {
            reject(err);
          } else {
            reject(invalidMessage);
          }
        });
    });
  }

  scan() {
    this.checkFileExists(this.packagePath)
      .then(() => {
        this.xpi = new Xpi(this.packagePath);
        return this.xpi.getMetaData();
      })
      .then((metadata) => {
        // Do something useful with package here.
        console.log(metadata);
      })
      .catch(err => {
        return this.handleError(err);
      });
  }
}
