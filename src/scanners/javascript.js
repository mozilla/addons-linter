import ESLint from 'eslint';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import * as rules from 'rules/javascript';
import { ensureFilenameExists, ignorePrivateFunctions,
         singleLineString } from 'utils';


export default class JavaScriptScanner {

  constructor(code, filename, options={}) {
    this.code = code;
    this.filename = filename;
    this.options = options;
    this.validatorMessages = [];
    this._rulesProcessed = 0;

    ensureFilenameExists(this.filename);
  }

  scan(_ESLint=ESLint) {
    return new Promise((resolve) => {
      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      var eslint = _ESLint.linter;
      var ruleFunctions = ignorePrivateFunctions(rules);

      for (let name in ruleFunctions) {
        this._rulesProcessed++;
        eslint.defineRule(name, ruleFunctions[name]);
      }

      var report = eslint.verify(this.code, {
        ignore: false,
        rules: ESLINT_RULE_MAPPING,
        env: { es6: true },
      }, {
        allowInlineConfig: false,
        filename: this.filename,
      });

      for (let message of report) {
        // Fatal error messages (like SyntaxErrors) are a bit different, we
        // need to handle them specially.
        if (message.fatal === true) {
          message.message = messages.JS_SYNTAX_ERROR.code;
        }

        if (typeof message.message === 'undefined') {
          throw new Error(singleLineString`JS rules must pass a valid message as
                          the second argument to context.report()`);
        }

        // Fallback to looking up the message object by the
        var messageObj = messages[message.message];
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
