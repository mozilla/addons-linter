import ESLint from 'eslint';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import * as rules from 'rules/javascript';
import { ensureFilenameExists, ignorePrivateFunctions,
         singleLineString } from 'utils';


export default class JavaScriptScanner {

  _defaultRules = rules;

  constructor(code, filename, options={}) {
    this.code = code;
    this.filename = filename;
    this.options = options;
    this.validatorMessages = [];
    this._rulesProcessed = 0;

    ensureFilenameExists(this.filename);
  }

  scan(_ESLint=ESLint, {
    _rules=this._defaultRules,
    _ruleMapping=ESLINT_RULE_MAPPING,
    _messages=messages,
  }={}) {
    return new Promise((resolve) => {
      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      var eslint = _ESLint.linter;
      var rules = ignorePrivateFunctions(_rules);

      for (let name in rules) {
        this._rulesProcessed++;
        eslint.defineRule(name, rules[name]);
      }

      var report = eslint.verify(this.code, {
        env: { es6: true },
        ignore: false,
        rules: _ruleMapping,
        settings: {
          addonMetadata: this.options.addonMetadata,
        },
      }, {
        allowInlineConfig: false,
        filename: this.filename,
      });

      for (let message of report) {
        // Fatal error messages (like SyntaxErrors) are a bit different, we
        // need to handle them specially.
        if (message.fatal === true) {
          message.message = _messages.JS_SYNTAX_ERROR.code;
        }

        if (typeof message.message === 'undefined') {
          throw new Error(singleLineString`JS rules must pass a valid message as
                          the second argument to context.report()`);
        }

        // Fallback to looking up the message object by the
        var messageObj = _messages[message.message];
        var code = message.message;

        this.validatorMessages.push({
          code: code,
          column: message.column,
          description: messageObj.description,
          file: this.filename,
          line: message.line,
          message: messageObj.message,
          sourceCode: message.source,
          type: ESLINT_TYPES[message.severity],
        });
      }

      resolve(this.validatorMessages);
    });
  }
}
