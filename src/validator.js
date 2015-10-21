import { extname } from 'path';
import * as fs from 'fs';

import columnify from 'columnify';
import chalk from 'chalk';
import promisify from 'es6-promisify';

import { terminalWidth } from 'cli';
import * as constants from 'const';
import * as exceptions from 'exceptions';
import * as messages from 'messages';
import { getPackageTypeAsString,
         checkMinNodeVersion,
         gettext as _, singleLineString } from 'utils';

import log from 'logger';
import Collector from 'collector';
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

  detectPackageType() {
    var installRdfPath = 'install.rdf';

    return this.xpi.getMetaData()
      .then((metadata) => {
        if (metadata.hasOwnProperty(installRdfPath)) {
          return this.xpi.getFileAsString(installRdfPath)
            .then((content) => {
              var rdfScanner = new RDFScanner(content, installRdfPath);
              return rdfScanner.getContents();
            })
            .then((xmlDoc) => {
              // Lookup addon type from install.rdf.
              return new Promise((resolve) => {
                var typeNodes = xmlDoc.getElementsByTagName('em:type');
                if (typeNodes.length > 1) {
                  throw new Error('Multiple <em:type> elements found');
                }
                var node = typeNodes[0];
                if (node && node.firstChild && node.firstChild.nodeValue) {
                  var typeValue = node.firstChild.nodeValue;
                  var resolvedTypeValue = null;
                  if (!constants.INSTALL_RDF_TYPE_MAP
                        .hasOwnProperty(typeValue)) {
                    log.debug('Invalid type value "%s"', typeValue);
                    this.collector.addError(messages.TYPE_INVALID);
                  } else {
                    var resolvedTypeValue =
                      constants.INSTALL_RDF_TYPE_MAP[typeValue];
                    log.debug('Mapping original <em:type> value "%s" -> "%s"',
                              typeValue, resolvedTypeValue);
                  }
                  // This will resolve with null or the actual value.
                  resolve(resolvedTypeValue);
                } else {
                  log.warn('<em:type> was not found in install.rdf');
                  this.collector.addNotice(messages.TYPE_MISSING);
                  resolve(null);
                }
              });
            });
        } else {
          log.warn('No install.rdf was found in the package metadata');
          this.collector.addNotice(messages.TYPE_NO_INSTALL_RDF);
          return Promise.resolve(null);
        }
      }).then((packageType) => {
        if (packageType === null) {
          log.info(singleLineString`Determining addon type from install.rdf
                   failed. Guessing from layout`);
          return this.xpi.getMetaData()
            .then((metadata) => {
              for (let path_ of Object.keys(metadata)) {
                if (path_.startsWith('dictionaries/')) {
                  return Promise.resolve(
                    constants.PACKAGE_DICTIONARY);
                }
              }

              // TODO: This follows the amo-validator approach.
              // There's no type element, so the spec says that it's either a
              // theme or an extension. At this point, we know that it isn't
              // a dictionary, language pack, or multiple extension pack.
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
        } else {
          return Promise.resolve(packageType);
        }
      });
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

    if (filename === 'chrome.manifest') {
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
          return this.detectPackageType();
        })
        .then((packageType) => {
          this.packageType = packageType;
          if (packageType) {
            log.debug('Package type detected as %s',
                      getPackageTypeAsString(packageType));
          }
          return this.xpi.getMetaData();
        })
        .then((metadata) => {
          var chromeManifest = 'chrome.manifest';
          if (metadata.hasOwnProperty(chromeManifest)) {
            return this.scanFile(chromeManifest, 'stream');
          } else {
            log.warn('No root chrome.manifest found');
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
