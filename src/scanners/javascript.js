import path from 'path';

import ESLint from 'eslint';

import { ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import ESLintRules from 'rules/javascript';
import { singleLineString } from 'utils';


export default class JavaScriptScanner {

  constructor(code, filename) {
    this.code = code;
    this.filename = filename;
  }

  scan(_ESLint=ESLint) {
    return new Promise((resolve) => {

      var rulesPath = global.relativeAppPath ?
        path.join(global.relativeAppPath, '../dist/eslint') : 'dist/eslint';

      // ESLint is synchronous and doesn't accept streams, so we need to
      // pass it the entire source file as a string.
      let eslint = new _ESLint.CLIEngine({
        ignore: false,
        rulePaths: [rulesPath],
        rules: ESLintRules,
        useEslintrc: false,
        envs: ['es6'],
      });

      var validatorMessages = [];
      var report = eslint.executeOnText(this.code, this.filename);

      for (let message of report.results[0].messages) {
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
