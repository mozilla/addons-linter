import * as cssParser from 'css';
import * as cssRules from 'rules/css';
import { CSS_SYNTAX_ERROR } from 'messages';
import { VALIDATION_ERROR } from 'const';


export default class CSSScanner {

  constructor(code, filename) {
    this.code = code;
    this.filename = filename;
  }

  scan(_cssParser=cssParser) {
    return new Promise((resolve, reject) => {
      var messages = [];

      try {
        var ast = _cssParser.parse(this.code, {source: this.filename});
      } catch (e) {
        if (!e.reason || e instanceof Error === false) {
          return reject(e);
        } else {
          messages.push(Object.assign({}, CSS_SYNTAX_ERROR, {
            type: VALIDATION_ERROR,
            // Use the reason for the error as the message.
            message: e.reason,
            column: e.column,
            line: e.line,
            file: e.filename,
          }));
        }
        // A syntax error has been encounted so it's game over.
        return resolve(messages);
      }

      if (ast && ast.stylesheet && ast.stylesheet.rules) {
        for (let rule of ast.stylesheet.rules) {
          if (rule.type === 'comment') {
            continue;
          }
          for (let cssRule in cssRules) {
            let cssRuleFunc = cssRules[cssRule];
            if (typeof cssRuleFunc === 'function') {
              cssRuleFunc(rule, messages);
            }
          }
        }
      }
      resolve(messages);
    });
  }
}
