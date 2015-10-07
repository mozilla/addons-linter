import path from 'path';

import ESLint from 'eslint';

import { ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import ESLintRules from 'rules';


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
        rulePaths: [path.join('src', 'rules')],
        rules: ESLintRules,
        useEslintrc: false,
      });

      var validatorMessages = [];
      var report = eslint.executeOnText(this.code, this.filename);

      for (let message of report.results[0].messages) {
        validatorMessages.push({
          code: message.ruleId.toUpperCase(),
          column: message.column,
          description: messages[message.ruleId.toUpperCase()].description,
          sourceCode: message.source,
          file: this.filename,
          line: message.line,
          message: messages[message.ruleId.toUpperCase()].message,
          severity: ESLINT_TYPES[message.severity],
        });
      }

      resolve(validatorMessages);
    });
  }


}
