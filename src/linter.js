import path from 'path';

import columnify from 'columnify';
import chalk from 'chalk';
import { oneLine } from 'common-tags';
import { lstat } from 'addons-scanner-utils/dist/io/utils';
import {
  DuplicateZipEntryError,
  InvalidZipFileError,
} from 'addons-scanner-utils/dist/errors';
import { Directory, Xpi, Crx } from 'addons-scanner-utils/dist/io';

import { terminalWidth } from 'cli';
import * as constants from 'const';
import { BANNED_LIBRARIES, UNADVISED_LIBRARIES } from 'libraries';
import * as messages from 'messages';
import {
  checkMinNodeVersion,
  i18n,
  couldBeMinifiedCode,
  getLineAndColumnFromMatch,
  AddonsLinterUserError,
} from 'utils';
import log from 'logger';
import Collector from 'collector';
import DefaultManifestJSONParser from 'parsers/manifestjson';
import BinaryScanner from 'scanners/binary';
import FilenameScanner from 'scanners/filename';
import HTMLScanner from 'scanners/html';
import JavaScriptScanner from 'scanners/javascript';
import JSONScanner from 'scanners/json';
import LangpackScanner from 'scanners/langpack';
import { MINER_BLOCKLIST } from 'miner_blocklist';
import Dispensary from 'dispensary';

export default class Linter {
  constructor(config) {
    this.config = config;
    [this.packagePath] = config._;
    this.io = null;
    this.chalk = new chalk.Instance({ enabled: !this.config.boring });
    this.collector = new Collector(config);
    this.addonMetadata = null;
    this.shouldScanFile = this.shouldScanFile.bind(this);
  }

  set config(cfg) {
    this._config = cfg;

    // normalize the scanFile option:
    // convert into an array if needed and filter out any undefined
    // or empty strings.
    if (this._config.scanFile) {
      let scanFile = Array.isArray(this._config.scanFile)
        ? this._config.scanFile
        : [this._config.scanFile];
      scanFile = scanFile.filter((el) => el && el.length > 0);

      this._config.scanFile = scanFile;
    }
  }

  get config() {
    return this._config;
  }

  validateConfig() {
    const { minManifestVersion, maxManifestVersion } = this.config;
    if (maxManifestVersion < minManifestVersion) {
      throw new AddonsLinterUserError(
        i18n.sprintf(
          i18n._(
            `Invalid manifest version range requested:
            --min-manifest-version (currently set to %(minManifestVersion)s)
            should not be greater than
            --max-manifest-version (currently set to %(maxManifestVersion)s).`
          ),
          { minManifestVersion, maxManifestVersion }
        )
      );
    }
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
        throw new Error(oneLine`colorize passed invalid type.
          Should be one of ${constants.MESSAGE_TYPES.join(', ')}`);
    }
  }

  closeIO() {
    // This is only used when `io` is valid and we disabled the auto-close
    // feature.
    if (this.config.disableXpiAutoclose && this.io) {
      this.io.close();
    }
  }

  handleError(err, _console = console) {
    // The zip files contains invalid entries (likely path names using invalid
    // characters like '\\'), the linter can inspect the package but Firefox
    // would fail to load it.
    if (err instanceof InvalidZipFileError) {
      this.collector.addError({
        ...messages.INVALID_XPI_ENTRY,
        message: err.message,
      });
      this.print(_console);
      return true;
    }

    // The zip file contains multiple entries with the exact same file name.
    if (err instanceof DuplicateZipEntryError) {
      this.collector.addError(messages.DUPLICATE_XPI_ENTRY);
      this.print(_console);
      return true;
    }

    // The zip file fails to open successfully, the linter can't inspect it
    // at all.
    if (err.message.includes(constants.ZIP_LIB_CORRUPT_FILE_ERROR)) {
      this.collector.addError(messages.BAD_ZIPFILE);
      this.print(_console);
      return true;
    }

    if (this.config.stack === true) {
      _console.error(err.stack);
    } else {
      _console.error(this.chalk.red(err.message || err));
    }

    this.closeIO();

    return false;
  }

  print(_console = console) {
    if (this.config.output === 'none') {
      return;
    }
    if (this.config.output === 'json') {
      _console.log(this.toJSON(this.config.pretty));
    } else {
      _console.log(this.textOutput());
    }
  }

  toJSON({
    input = this.output,
    pretty = this.config.pretty,
    _JSON = JSON,
  } = {}) {
    const args = [input];
    if (pretty === true) {
      args.push(null);
      args.push(4);
    }
    return _JSON.stringify.apply(null, args);
  }

  textOutput(_terminalWidth = terminalWidth) {
    const maxColumns = _terminalWidth();
    const out = [];

    out.push(i18n._('Validation Summary:'));
    out.push('');
    out.push(
      columnify(this.output.summary, {
        showHeaders: false,
        minWidth: 15,
      })
    );
    out.push('');

    constants.MESSAGE_TYPES.forEach((type) => {
      const messageType = `${type}s`;
      if (this.output[messageType].length) {
        const outputConfig = {
          code: {
            dataTransform: (value) => {
              return this.colorize(type)(value);
            },
            headingTransform: () => {
              return i18n._('Code');
            },
            maxWidth: 35,
          },
          message: {
            headingTransform: () => {
              return i18n._('Message');
            },
            maxWidth: (maxColumns - 35) * 0.25,
          },
          description: {
            headingTransform: () => {
              return i18n._('Description');
            },
            maxWidth: (maxColumns - 35) * 0.5,
          },
          file: {
            headingTransform: () => {
              return i18n._('File');
            },
            maxWidth: (maxColumns - 35) * 0.25,
          },
          line: {
            headingTransform: () => {
              return i18n._('Line');
            },
            maxWidth: 6,
          },
          column: {
            headingTransform: () => {
              return i18n._('Column');
            },
            maxWidth: 6,
          },
        };

        const outputColumns = [
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

          outputConfig.message.maxWidth = (maxColumns - 47) * 0.5;
          outputConfig.file.maxWidth = (maxColumns - 35) * 0.5;
        }

        out.push(`${messageType.toUpperCase()}:`);
        out.push('');
        out.push(
          columnify(this.output[messageType], {
            maxWidth: 35,
            columns: outputColumns,
            columnSplitter: '   ',
            config: outputConfig,
          })
        );
      }
    });

    if (this.output.scanFile) {
      out.push(`Selected files: ${this.output.scanFile.join(', ')}`);
      out.push('');
    }

    return out.join('\n');
  }

  get output() {
    const output = {
      count: this.collector.length,
      summary: {},
      metadata: this.addonMetadata,
    };

    if (this.config.scanFile) {
      output.scanFile = this.config.scanFile;
    }

    constants.MESSAGE_TYPES.forEach((type) => {
      const messageType = `${type}s`;
      output[messageType] = this.collector[messageType];
      output.summary[messageType] = this.collector[messageType].length;
    });
    return output;
  }

  async getAddonMetadata({
    _log = log,
    ManifestJSONParser = DefaultManifestJSONParser,
  } = {}) {
    if (this.addonMetadata !== null) {
      _log.debug('Metadata already set; returning cached metadata.');
      return this.addonMetadata;
    }
    const files = await this.io.getFiles();
    if (Object.prototype.hasOwnProperty.call(files, constants.MANIFEST_JSON)) {
      _log.info('Retrieving metadata from manifest.json');
      const json = await this.io.getFileAsString(constants.MANIFEST_JSON);
      const manifestParser = new ManifestJSONParser(json, this.collector, {
        io: this.io,
        isAlreadySigned: Object.keys(files).some((filename) =>
          constants.ALREADY_SIGNED_REGEX.test(filename)
        ),
        selfHosted: this.config.selfHosted,
        schemaValidatorOptions: {
          privileged: this.config.privileged,
          minManifestVersion: this.config.minManifestVersion,
          maxManifestVersion: this.config.maxManifestVersion,
          enableBackgroundServiceWorker:
            this.config.enableBackgroundServiceWorker,
        },
      });
      await manifestParser.validateIcons();
      if (manifestParser.isStaticTheme) {
        await manifestParser.validateStaticThemeImages();
      }

      this.addonMetadata = manifestParser.getMetadata();
    } else {
      _log.warn(
        `No ${constants.MANIFEST_JSON} was found in the package metadata`
      );
      this.collector.addError(messages.TYPE_NO_MANIFEST_JSON);
      this.addonMetadata = {};
    }
    this.addonMetadata.totalScannedFileSize = 0;
    return this.addonMetadata;
  }

  async checkFileExists(filepath, _lstat = lstat) {
    const invalidMessage = new Error(
      `Path "${filepath}" is not a file or directory or does not exist.`
    );
    try {
      const stats = await _lstat(filepath);
      if (stats.isFile() === true || stats.isDirectory() === true) {
        return stats;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    throw invalidMessage;
  }

  scanFiles(files) {
    const promises = [];
    files.forEach((filename) => {
      promises.push(this.scanFile(filename));
    });
    return Promise.all(promises);
  }

  getScanner(filename) {
    const filenameWithoutPath = path.basename(filename);

    if (
      filename.match(constants.HIDDEN_FILE_REGEX) ||
      filename.match(constants.FLAGGED_FILE_REGEX) ||
      constants.FLAGGED_FILE_EXTENSIONS.includes(path.extname(filename)) ||
      filename.match(constants.ALREADY_SIGNED_REGEX) ||
      constants.RESERVED_FILENAMES.includes(filenameWithoutPath)
    ) {
      return FilenameScanner;
    }

    switch (path.extname(filename)) {
      case '.html':
      case '.htm':
        return HTMLScanner;
      case '.js':
      case '.jsm':
      case '.mjs':
        return JavaScriptScanner;
      case '.json':
        return JSONScanner;
      case '.properties':
      case '.ftl':
      case '.dtd':
        return LangpackScanner;
      default:
        return BinaryScanner;
    }
  }

  async scanFile(filename) {
    let scanResult = { linterMessages: [], scannedFiles: [] };
    const ScannerClass = this.getScanner(filename);
    const fileData = await this.io.getFile(
      filename,
      ScannerClass.fileResultType
    );

    // First: check that this file is under our 2MB parsing limit. Otherwise
    // it will be very slow and may crash the lint with an out-of-memory
    // error.
    const fileSize =
      typeof this.io.files[filename].size !== 'undefined'
        ? this.io.files[filename].size
        : this.io.files[filename].uncompressedSize;
    const maxSize = 1024 * 1024 * constants.MAX_FILE_SIZE_TO_PARSE_MB;

    if (
      ScannerClass !== BinaryScanner &&
      ScannerClass !== FilenameScanner &&
      fileSize >= maxSize
    ) {
      const filesizeError = {
        ...messages.FILE_TOO_LARGE,
        file: filename,
        type: constants.VALIDATION_ERROR,
      };

      scanResult = {
        linterMessages: [filesizeError],
        scannedFiles: [filename],
      };
    } else {
      if (ScannerClass !== BinaryScanner && ScannerClass !== FilenameScanner) {
        // Check for coin miners
        this._markCoinMinerUsage(filename, fileData);

        if (this.addonMetadata) {
          this.addonMetadata.totalScannedFileSize += fileSize;
        }
      }

      const scanner = new ScannerClass(fileData, filename, {
        addonMetadata: this.addonMetadata,
        // This is for the JSONScanner, which is a bit of an anomaly and
        // accesses the collector directly.
        // TODO: Bring this in line with other scanners, see:
        // https://github.com/mozilla/addons-linter/issues/895
        collector: this.collector,
        // list of disabled rules for js scanner
        disabledRules: this.config.disableLinterRules,
        existingFiles: this.io.files,
        privileged: this.config.privileged,
      });

      scanResult = await scanner.scan();
    }

    // messages should be a list of raw message data objects.
    const { linterMessages, scannedFiles } = scanResult;

    linterMessages.forEach((message) => {
      if (typeof message.type === 'undefined') {
        throw new Error('message.type must be defined');
      }
      this.collector._addMessage(message.type, message);
    });

    scannedFiles.forEach((_filename) => {
      this.collector.recordScannedFile(_filename, ScannerClass.scannerName);
    });
  }

  async extractMetadata({
    _Crx = Crx,
    _Directory = Directory,
    _Xpi = Xpi,
    _console = console,
  } = {}) {
    await checkMinNodeVersion();

    const stats = await this.checkFileExists(this.packagePath);

    // Simple logging adapter for addons-scanner-utils IO.
    const stderr = {
      debug: (message) => log.debug(message),
      error: (message) => log.error(message),
      info: (message) => log.info(message),
    };

    if (stats.isFile()) {
      if (this.packagePath.endsWith('.crx')) {
        log.info('Package is a file ending in .crx; parsing as a CRX');
        this.io = new _Crx({ filePath: this.packagePath, stderr });
      } else {
        log.info('Package is a file. Attempting to parse as an .xpi/.zip');

        // We should set `autoClose` to `false` when we want to disable this
        // feature. By default, the auto-close feature is enabled.
        const autoClose = this.config.disableXpiAutoclose !== true;

        if (!autoClose) {
          log.info('Disabling the auto-close feature');
        }

        this.io = new _Xpi({ autoClose, filePath: this.packagePath, stderr });
      }
    } else {
      // If not a file then it's a directory.
      log.info('Package path is a directory. Parsing as a directory');
      this.io = new _Directory({ filePath: this.packagePath, stderr });
    }

    this.io.setScanFileCallback(this.shouldScanFile);

    let addonMetadata = await this.getAddonMetadata();
    addonMetadata = await this.markSpecialFiles(addonMetadata);

    log.info('Metadata option is set to %s', this.config.metadata);
    if (this.config.metadata === true) {
      const metadataObject = {
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

      _console.log(this.toJSON({ input: metadataObject }));
    }

    return addonMetadata;
  }

  shouldScanFile(fileOrDirName, isDir) {
    if (this.config.shouldScanFile) {
      return this.config.shouldScanFile(fileOrDirName, isDir);
    }

    if (this.config.scanFile) {
      const manifestFileNames = ['manifest.json', 'package.json'];

      // Always scan sub directories and the manifest files,
      // or the linter will not be able to detect the addon type.
      if (isDir || manifestFileNames.includes(fileOrDirName)) {
        return true;
      }

      return this.config.scanFile.some((v) => v === fileOrDirName);
    }

    // Defaults to true.
    return true;
  }

  async scan(deps = {}) {
    try {
      await this.extractMetadata(deps);
      const files = await this.io.getFiles();

      if (
        this.config.scanFile &&
        !this.config.scanFile.some((f) => Object.keys(files).includes(f))
      ) {
        const _files = this.config.scanFile.join(', ');
        throw new Error(`Selected file(s) not found: ${_files}`);
      }

      // Known libraries do not need to be scanned
      const filesWithoutJSLibraries = Object.keys(files).filter((file) => {
        return !Object.prototype.hasOwnProperty.call(
          this.addonMetadata.jsLibs,
          file
        );
      });

      await this.scanFiles(filesWithoutJSLibraries);
      this.closeIO();

      this.print(deps._console);
      // This is skipped in code coverage because the
      // test runs against un-instrumented code.
      /* istanbul ignore if */
      if (this.config.runAsBinary === true) {
        let exitCode = this.output.errors.length > 0 ? 1 : 0;
        if (exitCode === 0 && this.config.warningsAsErrors === true) {
          exitCode = this.output.warnings.length > 0 ? 1 : 0;
        }
        process.exit(exitCode);
      }
    } catch (err) {
      if (this.handleError(err, deps._console)) {
        return;
      }
      throw err;
    }
  }

  async run(deps = {}) {
    // Validate the config options from a linter perspective (in addition to the
    // yargs validation that already happened when the options are being parsed)
    // and throws if there are invalid options.
    this.validateConfig();

    if (this.config.metadata === true) {
      try {
        await this.extractMetadata(deps);
        this.closeIO();

        // This is skipped in the code coverage because the
        // test runs against un-instrumented code.
        /* istanbul ignore if */
        if (this.config.runAsBinary === true) {
          process.exit(this.output.errors.length > 0 ? 1 : 0);
        }

        return this.output;
      } catch (err) {
        log.debug(err);
        this.handleError(err, deps._console);
        throw err;
      }
    }

    await this.scan(deps);

    return this.output;
  }

  async markSpecialFiles(addonMetadata) {
    let _addonMetadata = await this._markEmptyFiles(addonMetadata);
    _addonMetadata = await this._markJSLibs(_addonMetadata);
    _addonMetadata = this._markBannedLibs(_addonMetadata);
    return this._markUnknownOrMinifiedCode(_addonMetadata);
  }

  _markBannedLibs(addonMetadata, _unadvisedLibraries = UNADVISED_LIBRARIES) {
    Object.keys(addonMetadata.jsLibs).forEach((pathToFile) => {
      if (BANNED_LIBRARIES.includes(addonMetadata.jsLibs[pathToFile])) {
        this.collector.addError({
          ...messages.BANNED_LIBRARY,
          file: pathToFile,
        });
      }

      if (_unadvisedLibraries.includes(addonMetadata.jsLibs[pathToFile])) {
        this.collector.addWarning({
          ...messages.UNADVISED_LIBRARY,
          file: pathToFile,
        });
      }
    });

    return addonMetadata;
  }

  async _markEmptyFiles(addonMetadata) {
    const emptyFiles = [];

    const files = await this.io.getFiles();
    Object.keys(files).forEach((filename) => {
      if (
        typeof files[filename].size === 'undefined' &&
        typeof files[filename].uncompressedSize === 'undefined'
      ) {
        throw new Error(`No size available for ${filename}`);
      }

      if (
        files[filename].size === 0 ||
        files[filename].uncompressedSize === 0
      ) {
        emptyFiles.push(filename);
      }
    });

    // eslint-disable-next-line no-param-reassign
    addonMetadata.emptyFiles = emptyFiles;
    return addonMetadata;
  }

  async _markJSLibs(addonMetadata) {
    const dispensary = new Dispensary();
    const jsLibs = {};
    const files = await this.io.getFilesByExt('.js');

    await Promise.all(
      files.map(async (filename) => {
        const file = await this.io.getFile(filename);
        const hashResult = dispensary.match(file);

        if (hashResult !== false) {
          log.debug(`${hashResult} detected in ${filename}`);
          jsLibs[filename] = hashResult;

          this.collector.addNotice({
            ...messages.KNOWN_LIBRARY,
            file: filename,
          });
        }
      })
    );

    // eslint-disable-next-line no-param-reassign
    addonMetadata.jsLibs = jsLibs;
    return addonMetadata;
  }

  async _markUnknownOrMinifiedCode(addonMetadata) {
    const unknownMinifiedFiles = [];

    const files = await this.io.getFilesByExt('.js');

    await Promise.all(
      files.map(async (filename) => {
        if (filename in addonMetadata.jsLibs) {
          return;
        }
        const fileData = await this.io.getFile(filename);
        if (couldBeMinifiedCode(fileData)) {
          log.debug(`Minified code detected in ${filename}`);
          unknownMinifiedFiles.push(filename);
        }
      })
    );

    // eslint-disable-next-line no-param-reassign
    addonMetadata.unknownMinifiedFiles = unknownMinifiedFiles;
    return addonMetadata;
  }

  _markCoinMinerUsage(filename, fileData) {
    if (fileData && fileData.trim()) {
      MINER_BLOCKLIST.filenames.forEach((nameRegex) => {
        const filenameMatch = filename.match(nameRegex);

        if (filenameMatch) {
          this.collector.addWarning({
            ...messages.COINMINER_USAGE_DETECTED,
            file: filename,
          });
        }

        const fileDataMatch = fileData.match(nameRegex);

        if (fileDataMatch) {
          const { matchedLine, matchedColumn } =
            getLineAndColumnFromMatch(fileDataMatch);

          this.collector.addWarning({
            ...messages.COINMINER_USAGE_DETECTED,
            file: filename,
            column: matchedColumn,
            line: matchedLine,
          });
        }
      });

      MINER_BLOCKLIST.code.forEach((codeRegex) => {
        const match = fileData.match(codeRegex);

        if (match) {
          const { matchedLine, matchedColumn } =
            getLineAndColumnFromMatch(match);

          this.collector.addWarning({
            ...messages.COINMINER_USAGE_DETECTED,
            file: filename,
            line: matchedLine,
            column: matchedColumn,
            // use instancePath for our actual match to avoid any obvious
            // duplicates
            instancePath: match[0],
          });
        }
      });
    }
  }
}
