import { extname } from 'path';

import columnify from 'columnify';
import chalk from 'chalk';
import Dispensary from 'dispensary';

import { lstatPromise } from 'io/utils';
import { terminalWidth } from 'cli';
import * as constants from 'const';
import { CHROME_MANIFEST, INSTALL_RDF, MANIFEST_JSON } from 'const';
import { BANNED_LIBRARIES, UNADVISED_LIBRARIES } from 'libraries';
import * as messages from 'messages';
import { checkMinNodeVersion, gettext as _, singleLineString } from 'utils';

import log from 'logger';
import Collector from 'collector';
import InstallRdfParser from 'parsers/installrdf';
import ManifestJSONParser from 'parsers/manifestjson';
import ChromeManifestScanner from 'scanners/chromemanifest';
import BinaryScanner from 'scanners/binary';
import CSSScanner from 'scanners/css';
import FilenameScanner from 'scanners/filename';
import HTMLScanner from 'scanners/html';
import JavaScriptScanner from 'scanners/javascript';
import RDFScanner from 'scanners/rdf';
import { Crx, Directory, Xpi } from 'io';


export default class Linter {

  constructor(config) {
    this.config = config;
    this.packagePath = config._[0];
    this.io;
    this.chalk = new chalk.constructor(
      {enabled: !this.config.boring});
    this.collector = new Collector();
    this.addonMetadata = null;
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
    if (err.message.includes('DuplicateZipEntry')) {
      this.collector.addError(messages.DUPLICATE_XPI_ENTRY);
      this.print(_console);
    } else if (err.message.includes(
      'end of central directory record signature not found')) {
      this.collector.addError(messages.BAD_ZIPFILE);
      this.print(_console);
    } else {
      if (this.config.stack === true) {
        _console.error(err.stack);
      } else {
        _console.error(this.chalk.red(err.message || err));
      }
    }
  }

  print(_console=console) {
    if (this.config.output === 'json') {
      _console.log(this.toJSON(this.config.pretty));
    } else {
      _console.log(this.textOutput());
    }
  }

  toJSON({input=this.output, pretty=this.config.pretty, _JSON=JSON} = {}) {
    var args = [input];
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
      metadata: this.addonMetadata,
    };
    for (let type of constants.MESSAGE_TYPES) {
      var messageType = `${type}s`;
      output[messageType] = this.collector[messageType];
      output.summary[messageType] = this.collector[messageType].length;
    }
    return output;
  }

  getAddonMetadata(_log=log) {
    if (this.addonMetadata !== null) {
      _log.debug('Metadata already set; returning cached metadata.');
      return Promise.resolve(this.addonMetadata);
    }

    return this.io.getFiles()
      .then((files) => {
        if (files.hasOwnProperty(INSTALL_RDF) &&
            files.hasOwnProperty(MANIFEST_JSON)) {
          _log.warn(`Both ${INSTALL_RDF} and ${MANIFEST_JSON} found`);
          this.collector.addError(messages.MULITPLE_MANIFESTS);
          return {};
        } else if (files.hasOwnProperty(INSTALL_RDF)) {
          _log.info('Retrieving metadata from install.rdf');
          return this.io.getFileAsString(INSTALL_RDF)
            .then((rdfString) => {
              // Gets an xml document object.
              var rdfScanner = new RDFScanner(rdfString, INSTALL_RDF);
              return rdfScanner.getContents();
            })
            .then((xmlDoc) => {
              _log.info('Got xmlDoc, running InstallRdfParser.getMetadata()');
              return new InstallRdfParser(xmlDoc, this.collector).getMetadata();
            });
        } else if (files.hasOwnProperty(MANIFEST_JSON)) {
          _log.info('Retrieving metadata from manifest.json');
          return this.io.getFileAsString(MANIFEST_JSON)
            .then((json) => {
              var manifestParser = new ManifestJSONParser(json, this.collector);
              return manifestParser.getMetadata();
            });
        } else {
          _log.warn(singleLineString`No ${INSTALL_RDF} or ${MANIFEST_JSON}
                   was found in the package metadata`);
          this.collector.addNotice(messages.TYPE_NO_MANIFEST_JSON);
          this.collector.addNotice(messages.TYPE_NO_INSTALL_RDF);
          return {};
        }
      })
      .then((addonMetadata) => {
        this.addonMetadata = addonMetadata;

        // The type must be explcitly defined. This behaviour differs the
        // historical approach by the amo-validator.
        // See mozilla/addons-linter#411.
        // In due course metadata checking code may surpass this error
        // being added here.
        if (!this.addonMetadata.type) {
          _log.error('Addon type lookup failed');
          this.collector.addError(messages.TYPE_NOT_DETERMINED);
        }

        return this.addonMetadata;
      });
  }

  checkFileExists(filepath, _lstatPromise=lstatPromise) {
    var invalidMessage = new Error(
      `Path "${filepath}" is not a file or directory or does not exist.`);
    return _lstatPromise(filepath)
      .then((stats) => {
        if (stats.isFile() === true || stats.isDirectory() === true) {
          return stats;
        } else {
          throw invalidMessage;
        }
      })
      .catch((err) => {
        if (err.code !== 'ENOENT') {
          throw err;
        } else {
          throw invalidMessage;
        }
      });
  }

  scanFiles(files) {
    var promises = [];
    for (let filename of files) {
      promises.push(this.scanFile(filename));
    }
    return Promise.all(promises);
  }

  getScanner(filename) {
    if (filename === CHROME_MANIFEST) {
      return ChromeManifestScanner;
    }

    if (filename.match(constants.HIDDEN_FILE_REGEX) ||
        filename.match(constants.FLAGGED_FILE_REGEX) ||
        filename.match(constants.FLAGGED_FILE_EXTENSION_REGEX) ||
        filename.match(constants.ALREADY_SIGNED_REGEX)) {
      return FilenameScanner;
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
        return BinaryScanner;
    }
  }

  scanFile(filename) {
    var ScannerClass = this.getScanner(filename);
    return this.io.getFile(filename, ScannerClass.fileResultType)
      .then((fileData) => {
        // First: check that this file is under our 2MB parsing limit. Otherwise
        // it will be very slow and may crash the lint with an out-of-memory
        // error.
        let fileSize = typeof this.io.files[filename].size !== 'undefined' ?
          this.io.files[filename].size :
          this.io.files[filename].uncompressedSize;
        var maxSize = 1024 * 1024 * constants.MAX_FILE_SIZE_TO_PARSE_MB;

        if (ScannerClass !== BinaryScanner && fileSize >= maxSize) {
          let filesizeError = Object.assign({}, messages.FILE_TOO_LARGE, {
            file: filename,
            type: constants.VALIDATION_ERROR,
          });
          return Promise.resolve([filesizeError]);
        }

        let scanner = new ScannerClass(fileData, filename, {
          addonMetadata: this.addonMetadata,
        });

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
        return;
      });
  }

  extractMetadata({ _Crx=Crx, _console=console, _Directory=Directory,
                    _Xpi=Xpi } = {}) {
    return checkMinNodeVersion()
      .then(() => {
        return this.checkFileExists(this.packagePath);
      })
      .then((stats) => {
        if (stats.isFile() === true) {
          if (this.packagePath.endsWith('.crx')) {
            log.info('Package is a file ending in .crx; parsing as a CRX');
            this.io = new _Crx(this.packagePath);
          } else {
            log.info('Package is a file. Attempting to parse as an .xpi/.zip');
            this.io = new _Xpi(this.packagePath);
          }
        } else if (stats.isDirectory()) {
          log.info('Package path is a directory. Parsing as a directory');
          this.io = new _Directory(this.packagePath);
        }
        return this.getAddonMetadata();
      })
      .then((addonMetadata) => {
        return this.markSpecialFiles(addonMetadata);
      })
      .then((addonMetadata) => {
        log.info('Metadata option is set to %s', this.config.metadata);
        if (this.config.metadata === true) {
          var metadataObject = {
            // Reflects if errors were encountered in extraction
            // of metadata.
            hasErrors: this.output.errors.length !== 0,
            metadata: addonMetadata,
          };

          // If errors exist the data is available via the
          // errors list.
          if (metadataObject.hasErrors) {
            metadataObject.errors = this.output.errors;
          }

          _console.log(this.toJSON({input: metadataObject}));
        }

        return addonMetadata;
      });
  }

  scan(deps={}) {
    return this.extractMetadata(deps)
      .then(() => {
        return this.io.getFiles();
      })
      .then((files) => {
        // Known libraries do not need to be scanned
        let filesWithoutJSLibraries = Object.keys(files).filter((file) => {
          return !this.addonMetadata.jsLibs.hasOwnProperty(file);
        }, this);
        return this.scanFiles(filesWithoutJSLibraries);
      })
      .then(() => {
        this.print();
        // This is skipped in the code coverage because the
        // test runs against un-instrumented code.
        /* istanbul ignore if  */
        if (this.config.runAsBinary === true) {
          process.exit(this.output.errors.length > 0 ? 1 : 0);
        }
      })
      .catch((err) => {
        this.handleError(err, deps._console);
        throw err;
      });
  }

  run(deps={}) {
    if (this.config.metadata === true) {
      return this.extractMetadata(deps)
        .then(() => {
          // This is skipped in the code coverage because the
          // test runs against un-instrumented code.
          /* istanbul ignore if  */
          if (this.config.runAsBinary === true) {
            process.exit(this.output.errors.length > 0 ? 1 : 0);
          }
        })
        .catch((err) => {
          log.debug(err);
          this.handleError(err, deps._console);
          throw err;
        });
    } else {
      return this.scan(deps);
    }
  }

  markSpecialFiles(addonMetadata) {
    return this._markEmptyFiles(addonMetadata)
      .then((addonMetadata) => {
        return this._markJSLibs(addonMetadata);
      })
      .then((addonMetadata) => {
        return this._markBannedLibs(addonMetadata);
      });
  }

  _markBannedLibs(addonMetadata, _unadvisedLibraries = UNADVISED_LIBRARIES) {
    for (let pathToFile in addonMetadata.jsLibs) {
      if (BANNED_LIBRARIES.includes(addonMetadata.jsLibs[pathToFile])) {
        this.collector.addError(
          Object.assign({}, messages.BANNED_LIBRARY, {
            file: pathToFile,
          })
        );
      }

      if (_unadvisedLibraries.includes(addonMetadata.jsLibs[pathToFile])) {
        this.collector.addWarning(
          Object.assign({}, messages.UNADVISED_LIBRARY, {
            file: pathToFile,
          })
        );
      }
    }

    return addonMetadata;
  }

  _markEmptyFiles(addonMetadata) {
    var emptyFiles = [];

    return this.io.getFiles()
      .then((files) => {
        for (let filename in files) {
          if (typeof files[filename].size === 'undefined' &&
              typeof files[filename].uncompressedSize === 'undefined') {
            throw new Error(`No size available for ${filename}`);
          }

          if (files[filename].size === 0 ||
              files[filename].uncompressedSize === 0) {
            emptyFiles.push(filename);
          }
        }

        addonMetadata.emptyFiles = emptyFiles;
        return addonMetadata;
      });
  }

  _markJSLibs(addonMetadata) {
    var dispensary = new Dispensary();
    var jsLibs = {};
    var promises = [];

    return this.io.getFilesByExt('.js')
      .then((files) => {
        for (let filename of files) {
          promises.push(this.io.getFile(filename)
            .then((file) => {
              var hashResult = dispensary.match(file);

              if (hashResult !== false) {
                log.debug(`${hashResult} detected in ${filename}`);
                jsLibs[filename] = hashResult;

                this.collector.addNotice(
                  Object.assign({}, messages.KNOWN_LIBRARY, {
                    file: filename,
                  })
                );
              }
            }));
        }

        return Promise.all(promises);
      }).then(() => {
        addonMetadata.jsLibs = jsLibs;
        return addonMetadata;
      });
  }

}
