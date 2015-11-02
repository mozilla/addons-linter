import ESLint from 'eslint';

import { ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import ESLintRules from 'rules/javascript';


export default class JavaScriptScanner {

  constructor(code, filename) {
    this.code = code;
    this.filename = filename;
  }

  scan() {
    return new Promise((resolve) => {
      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      let eslint = new ESLint.CLIEngine({
        ignore: false,
        rulePaths: ['dist/eslint'],
        rules: ESLintRules,
        useEslintrc: false,
      });

      var validatorMessages = [];
      var report = eslint.executeOnText(this.code, this.filename);

      for (let message of report.results[0].messages) {
        // Fatal error messages (like SyntaxErrors) are a bit different, we
        // need to handle them specially.
        if (message.fatal === true) {
          message.ruleId = messages.JS_SYNTAX_ERROR.code;
        }

        var code = message.ruleId.toUpperCase();
        var messageObj = messages[code];

        // Fallback to looking up the message object by the
        // constant string passed in context.report()
        if (!messageObj && message.message) {
          messageObj = messages[message.message];
          code = message.message;
        }

        validatorMessages.push({
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

      resolve(validatorMessages);
    });
  }
}
