import { extname } from 'path';
import * as fs from 'fs';

import columnify from 'columnify';
import chalk from 'chalk';
import promisify from 'es6-promisify';

import { terminalWidth } from 'cli';
import * as constants from 'const';
import { CHROME_MANIFEST, INSTALL_RDF, MANIFEST_JSON } from 'const';
import * as exceptions from 'exceptions';
import * as messages from 'messages';
import { checkMinNodeVersion,
         gettext as _, singleLineString } from 'utils';

import log from 'logger';
import Collector from 'collector';
import InstallRdfParser from 'parsers/installrdf';
import ManifestJSONParser from 'parsers/manifestjson';
import ChromeManifestScanner from 'scanners/chromemanifest';
import CSSScanner from 'scanners/css';
import HTMLScanner from 'scanners/html';
import JavaScriptScanner from 'scanners/javascript';
import RDFScanner from 'scanners/rdf';
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

  textOutput(_terminalWidth=terminalWidth) {
    var maxColumns = _terminalWidth();
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
        var outputConfig = {
          code: {
            dataTransform: (value) => {
              return this.colorize(type)(value);
            },
            headingTransform: () => {
              return _('Code');
            },
            maxWidth: 35,
          },
          message: {
            headingTransform: () => {
              return _('Message');
            },
            maxWidth: (maxColumns - 35) * .25,
          },
          description: {
            headingTransform: () => {
              return _('Description');
            },
            maxWidth: (maxColumns - 35) * .5,
          },
          file: {
            headingTransform: () => {
              return _('File');
            },
            maxWidth: (maxColumns - 35) * .25,
          },
          line: {
            headingTransform: () => {
              return _('Line');
            },
            maxWidth: 6,
          },
          column: {
            headingTransform: () => {
              return _('Column');
            },
            maxWidth: 6,
          },
        };

        var outputColumns = [
          'code',
          'message',
          'description',
          'file',
          'line',
          'column',
        ];

        // If the terminal is this small we cave and don't size things
        // contextually anymore.
        if (maxColumns < 60) {
          delete outputColumns[outputColumns.indexOf('column')];
          delete outputConfig.column;
          delete outputColumns[outputColumns.indexOf('description')];
          delete outputConfig.description;
          delete outputColumns[outputColumns.indexOf('line')];
          delete outputConfig.line;

          outputConfig.message.maxWidth = 15;
          outputConfig.file.maxWidth = 15;
        } else if (maxColumns < 78) {
          delete outputColumns[outputColumns.indexOf('description')];
          delete outputConfig.description;

          outputConfig.message.maxWidth = (maxColumns - 47) * .5;
          outputConfig.file.maxWidth = (maxColumns - 35) * .5;
        }

        out.push(`${messageType.toUpperCase()}:`);
        out.push('');
        out.push(columnify(this.output[messageType], {
          maxWidth: 35,
          columns: outputColumns,
          columnSplitter: '   ',
          config: outputConfig,
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

  getAddonMetaData() {
    return this.xpi.getMetaData()
      .then((xpiMeta) => {
        if (xpiMeta.hasOwnProperty(INSTALL_RDF) &&
            xpiMeta.hasOwnProperty(MANIFEST_JSON)) {
          throw new Error(`Both ${INSTALL_RDF} and ${MANIFEST_JSON} found`);
        } else if (xpiMeta.hasOwnProperty(INSTALL_RDF)) {
          log.info('Retrieving metadata from install.rdf');
          return this.xpi.getFileAsString(INSTALL_RDF)
            .then((rdf) => {
              return new InstallRdfParser(rdf, this.collector).getMetaData();
            });
        } else if (xpiMeta.hasOwnProperty(MANIFEST_JSON)) {
          log.info('Retrieving metadata from manifest.json');
          return this.xpi.getFileAsString(MANIFEST_JSON)
            .then((json) => {
              return new ManifestJSONParser(json, this.collector).getMetaData();
            });
        } else {
          log.warn(singleLineString`No ${INSTALL_RDF} or ${MANIFEST_JSON}
                   was found in the package metadata`);
          // TODO: Add notice for missing manifest.json?
          this.collector.addNotice(messages.TYPE_NO_INSTALL_RDF);
          return Promise.resolve({});
        }
      });
  }

  /*
   * When type lookups from install.rdf and manifest.json fail
   * this is used as a fall-back.
   * TODO: This follows the amo-validator approach - we should check
   * we still think this is warranted.
   * There's no type element, so the spec says that it's either a
   * theme or an extension. At this point, we know that it isn't
   * a dictionary, language pack, or multiple extension pack.
   */
  detectTypeFromLayout() {
    return this.xpi.getMetaData()
      .then((xpiMeta) => {
        for (let path_ of Object.keys(xpiMeta)) {
          if (path_.startsWith('dictionaries/')) {
            return Promise.resolve(constants.PACKAGE_DICTIONARY);
          }
        }

        log.warn('Falling back to decide type from package extension');

        var extensions = {
          '.jar': constants.PACKAGE_THEME,
          '.xpi': constants.PACKAGE_EXTENSION,
        };

        var ext = extname(this.packagePath);
        if (extensions.hasOwnProperty(ext)) {
          return Promise.resolve(extensions[ext]);
        }

        log.error('All attempts to lookup addon type failed');
        this.collector.addError(messages.TYPE_NOT_DETERMINED);
        return Promise.resolve(null);
      });
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

    if (filename === CHROME_MANIFEST) {
      return ChromeManifestScanner;
    }

    switch (extname(filename)) {
      case '.css':
        return CSSScanner;
      case '.html':
      case '.htm':
        return HTMLScanner;
      case '.js':
        return JavaScriptScanner;
      case '.rdf':
        return RDFScanner;
      default:
        throw new Error(`No scanner available for ${filename}`);
    }
  }

  scanFile(filename, streamOrString='string') {
    return new Promise((resolve, reject) => {
      this.xpi.getFile(filename, streamOrString)
        .then((contentsOrStream) => {
          let scanner = new (
            this.getScanner(filename))(contentsOrStream, filename);
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
          return this.getAddonMetaData();
        })
        .then((addonMetaData) => {
          this.addonMetaData = addonMetaData;
          if (!addonMetaData.type) {
            log.info('Determining addon type failed. Guessing from layout');
            return this.detectTypeFromLayout()
              .then((addonType) => {
                this.addonMetaData.type = addonType;
              });
          }
          return Promise.resolve();
        }).then(() => {
          return this.xpi.getMetaData();
        })
        .then((xpiMetaData) => {
          if (xpiMetaData.hasOwnProperty(CHROME_MANIFEST)) {
            return this.scanFile(CHROME_MANIFEST, 'stream');
          } else {
            log.warn(`No root ${CHROME_MANIFEST} found`);
            return Promise.resolve();
          }
        })
        .then(() => {
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
          return this.xpi.getFilesByExt('.html');
        })
        .then((htmlFiles) => {
          return this.scanFiles(htmlFiles);
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
