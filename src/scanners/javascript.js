import path from 'path';

import ESLint from 'eslint';
import { oneLine } from 'common-tags';

import {
  ESLINT_RULE_MAPPING,
  ESLINT_TYPES,
  ESLINT_OVERWRITE_MESSAGE,
} from 'const';
import * as messages from 'messages';
import { rules } from 'rules/javascript';
import { ensureFilenameExists } from 'utils';


export default class JavaScriptScanner {
  _defaultRules = rules;

  constructor(code, filename, options = {}) {
    this.code = code;
    this.filename = filename;
    this.options = options;
    this.linterMessages = [];
    this.scannedFiles = [];
    this._rulesProcessed = 0;

    ensureFilenameExists(this.filename);
  }

  static get fileResultType() {
    return 'string';
  }

  static get scannerName() {
    return 'javascript';
  }

  scan(_ESLint = ESLint, {
    _rules = this._defaultRules,
    _ruleMapping = ESLINT_RULE_MAPPING,
    _messages = messages,
  } = {}) {
    return new Promise((resolve) => {
      const cli = new _ESLint.CLIEngine({
        baseConfig: {
          env: {
            es6: true,
            webextension: true,
            browser: true,
          },
          settings: {
            addonMetadata: this.options.addonMetadata,
          },
        },
        parserOptions: {
          ecmaVersion: 2017,
        },
        rules: _ruleMapping,
        plugins: ['no-unsafe-innerhtml'],
        allowInlineConfig: false,

        // Disable ignore-mode and overwrite eslint default ignore patterns
        // so an add-on's bower and node module folders are included in
        // the scan. See: https://github.com/mozilla/addons-linter/issues/1288
        ignore: false,
        patterns: ['!bower_components/*', '!node_modules/*'],

        filename: this.filename,
        // Avoid loading the addons-linter .eslintrc file
        useEslintrc: false,
      });

      Object.keys(_rules).forEach((name) => {
        this._rulesProcessed++;
        _ESLint.linter.defineRule(name, _rules[name]);
      });

      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      const report = cli.executeOnText(this.code, this.filename, true);

      report.results.forEach((result) => {
        // eslint prepends the filename with the current working directory,
        // strip that out.
        const relativePath = path.relative(process.cwd(), result.filePath);

        this.scannedFiles.push(relativePath);

        result.messages.forEach((message) => {
          // Fatal error messages (like SyntaxErrors) are a bit different, we
          // need to handle them specially.
          if (message.fatal === true) {
            // eslint-disable-next-line no-param-reassign
            message.message = _messages.JS_SYNTAX_ERROR.code;
          }

          if (typeof message.message === 'undefined') {
            throw new Error(
              oneLine`JS rules must pass a valid message as
              the second argument to context.report()`);
          }

          // Fallback to looking up the message object by the message
          let code = message.message;
          let shortDescription;
          let description;

          // Support 3rd party eslint rules that don't have our internal
          // message structure and allow us to optionally overwrite
          // their `message` and `description`.
          if (Object.prototype.hasOwnProperty.call(_messages, code)) {
            shortDescription = _messages[code].message;
            description = _messages[code].description;
          } else if (Object.prototype.hasOwnProperty.call(
            ESLINT_OVERWRITE_MESSAGE, message.ruleId)) {
            const overwrites = ESLINT_OVERWRITE_MESSAGE[message.ruleId];
            shortDescription = overwrites.message || message.message;
            description = overwrites.description || message.description;

            if (overwrites.code) {
              code = overwrites.code;
            }
          } else {
            shortDescription = code;
            description = null;
          }

          this.linterMessages.push({
            code,
            column: message.column,
            description,
            file: this.filename,
            line: message.line,
            message: shortDescription,
            sourceCode: message.source,
            type: ESLINT_TYPES[message.severity],
          });
        });
      });
      resolve({
        linterMessages: this.linterMessages,
        scannedFiles: this.scannedFiles,
      });
    });
  }
}
