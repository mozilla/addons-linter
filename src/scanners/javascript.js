import ESLint from 'eslint';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import { rules } from 'rules/javascript';
import { ensureFilenameExists, singleLineString } from 'utils';


export default class JavaScriptScanner {

  _defaultRules = rules;

  constructor(code, filename, options={}) {
    this.code = code;
    this.filename = filename;
    this.options = options;
    this.linterMessages = [];
    this._rulesProcessed = 0;

    ensureFilenameExists(this.filename);
  }

  static get fileResultType() {
    return 'string';
  }

  scan(_ESLint=ESLint, {
    _rules=this._defaultRules,
    _ruleMapping=ESLINT_RULE_MAPPING,
    _messages=messages,
  }={}) {
    return new Promise((resolve) => {
      var cli = new _ESLint.CLIEngine({
        baseConfig: {
          env: { es6: true, webextension: true, browser: true },
          parserOptions: { ecmaVersion: 2017 },
          settings: {
            addonMetadata: this.options.addonMetadata,
          },
        },
        ignore: false,
        rules: _ruleMapping,
        plugins: ['no-unsafe-innerhtml'],
        allowInlineConfig: false,
        filename: this.filename,
        // Avoid loading the addons-linter .eslintrc file
        useEslintrc: false,
      });

      for (const name in _rules) {
        this._rulesProcessed++;
        _ESLint.linter.defineRule(name, _rules[name]);
      }

      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      var report = cli.executeOnText(this.code, this.filename, true);

      for (const result of report.results) {
        for (const message of result.messages) {
          // Fatal error messages (like SyntaxErrors) are a bit different, we
          // need to handle them specially.
          if (message.fatal === true) {
            message.message = _messages.JS_SYNTAX_ERROR.code;
          }

          if (typeof message.message === 'undefined') {
            throw new Error(
              singleLineString`JS rules must pass a valid message as
              the second argument to context.report()`);
          }

          // Fallback to looking up the message object by the message
          var code = message.message;

          // Support 3rd party eslint rules that don't have our internal
          // message structure.
          if (_messages.hasOwnProperty(code)) {
            var shortDescription = _messages[code].message;
            var description = _messages[code].description;
          } else {
            var shortDescription = code;
            var description = null;
          }

          this.linterMessages.push({
            code: code,
            column: message.column,
            description: description,
            file: this.filename,
            line: message.line,
            message: shortDescription,
            sourceCode: message.source,
            type: ESLINT_TYPES[message.severity],
          });
        }
      }

      resolve(this.linterMessages);
    });
  }
}
