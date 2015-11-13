import { extname } from 'path';
import * as fs from 'fs';

import columnify from 'columnify';
import chalk from 'chalk';
import promisify from 'es6-promisify';

import { terminalWidth } from 'cli';
import * as constants from 'const';
import { ARCH_DEFAULT, ARCH_JETPACK, CHROME_MANIFEST, INSTALL_RDF,
         MANIFEST_JSON } from 'const';
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
import MetadataScanner from 'scanners/metadata';
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
    this.addonMetaData = {};
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
    };
    for (let type of constants.MESSAGE_TYPES) {
      var messageType = `${type}s`;
      output[messageType] = this.collector[messageType];
      output.summary[messageType] = this.collector[messageType].length;
    }
    return output;
  }

  getAddonMetaData() {
    var _xpiFiles;

    return this.xpi.getFiles()
      .then((xpiFiles) => {
        // Used later to get add-on architecture.
        _xpiFiles = xpiFiles;

        if (xpiFiles.hasOwnProperty(INSTALL_RDF) &&
            xpiFiles.hasOwnProperty(MANIFEST_JSON)) {
          throw new Error(`Both ${INSTALL_RDF} and ${MANIFEST_JSON} found`);
        } else if (xpiFiles.hasOwnProperty(INSTALL_RDF)) {
          log.info('Retrieving metadata from install.rdf');
          return this.xpi.getFileAsString(INSTALL_RDF)
            .then((rdf) => {
              return new InstallRdfParser(rdf, this.collector).getMetaData();
            });
        } else if (xpiFiles.hasOwnProperty(MANIFEST_JSON)) {
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
          return {};
        }
      })
      .then((addonMetaData) => {
        addonMetaData.architecture = this._getAddonArchitecture(_xpiFiles);

        if (!addonMetaData.type) {
          log.info('Determining addon type failed. Guessing from layout');
          return this.detectTypeFromLayout()
            .then((addonType) => {
              addonMetaData.type = addonType;
              return addonMetaData;
            });
        } else {
          return addonMetaData;
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
    return this.xpi.getFiles()
      .then((xpiFiles) => {
        for (let path_ of Object.keys(xpiFiles)) {
          if (path_.startsWith('dictionaries/')) {
            return constants.PACKAGE_DICTIONARY;
          }
        }

        log.warn('Falling back to decide type from package extension');

        var extensions = {
          '.jar': constants.PACKAGE_THEME,
          '.xpi': constants.PACKAGE_EXTENSION,
        };

        var ext = extname(this.packagePath);
        if (extensions.hasOwnProperty(ext)) {
          return extensions[ext];
        }

        log.error('All attempts to lookup addon type failed');
        this.collector.addError(messages.TYPE_NOT_DETERMINED);
        return null;
      });
  }

  checkFileExists(filepath, _lstat=lstat) {
    var invalidMessage = new Error(
      `Path "${filepath}" is not a file or does not exist.`);
    return _lstat(filepath)
      .then((stats) => {
        if (stats.isFile() === true) {
          return;
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
    return this.xpi.getFile(filename, streamOrString)
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
        return;
      });
  }

  scanMetadata(metadata, _MetadataScanner=MetadataScanner) {
    var scanner = new _MetadataScanner(metadata, 'XPI');

    return scanner.scan()
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

  extractMetaData(_Xpi=Xpi, _console=console) {
    return checkMinNodeVersion()
      .then(() => {
        return this.checkFileExists(this.packagePath);
      })
      .then(() => {
        this.xpi = new _Xpi(this.packagePath);
        return this.getAddonMetaData();
      }).then((addonMetaData) => {
        this.addonMetaData = addonMetaData;
        if (this.config.metadata === true) {
          _console.log(this.toJSON({input: addonMetaData}));
        }
        return;
      });
  }

  scan(_Xpi=Xpi) {
    return this.extractMetaData(_Xpi)
      .then(() => {
        return this.xpi.getFiles();
      })
      .then((xpiFiles) => {
        if (xpiFiles.hasOwnProperty(CHROME_MANIFEST)) {
          return this.scanFile(CHROME_MANIFEST, 'stream');
        } else {
          log.warn(`No root ${CHROME_MANIFEST} found`);
          return;
        }
      })
      .then(() => {
        return this.getAddonMetaData();
      })
      .then((addonMetadata) => {
        return this.scanMetadata(addonMetadata);
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
        return;
      })
      .catch((err) => {
        if (err instanceof exceptions.DuplicateZipEntryError) {
          this.collector.addError(messages.DUPLICATE_XPI_ENTRY);
          this.print();
        } else {
          this.handleError(err);
        }
        throw err;
      });
  }

  run(_Xpi=Xpi) {
    if (this.config.metadata === true) {
      return this.extractMetaData(_Xpi);
    } else {
      return this.scan(_Xpi);
    }
  }

  _getAddonArchitecture(xpiMetaData) {
    // If we find a file named bootstrap.js this is assumed to be a
    // Jetpack add-on: https://github.com/mozilla/amo-validator/blob/7a8011aba8bf8c665aef2b51eb26d0697b3e19c3/validator/testcases/jetpack.py#L154
    // TODO: Check against file contents to make this more robust.
    var files = Object.keys(xpiMetaData);

    if (files.includes('bootstrap.js') &&
        (files.includes('harness-options.json') ||
         files.includes('package.json'))) {
      return ARCH_JETPACK;
    } else {
      return ARCH_DEFAULT;
    }
  }
}
