import BaseScanner from 'scanners/base';
import * as cssParser from 'css';
import * as rules from 'rules/css';
import { CSS_SYNTAX_ERROR } from 'messages';
import { VALIDATION_ERROR } from 'const';
import { ignorePrivateFunctions } from 'utils';


export default class CSSScanner extends BaseScanner {

  _defaultRules = rules;

  scan(_rules=this._defaultRules) {
    return new Promise((resolve, reject) => {
      this.getContents()
        .then((ast) => {
          if (ast && ast.stylesheet && ast.stylesheet.rules) {
            var rules = ignorePrivateFunctions(_rules);

            for (let cssRule in rules) {
              this._rulesProcessed++;

              for (let rule of ast.stylesheet.rules) {
                if (rule.type === 'comment') {
                  continue;
                }

                this.validatorMessages = this.validatorMessages.concat(
                  rules[cssRule](rule));
              }
            }
          }

          resolve(this.validatorMessages);
        })
        .catch(reject);
    });
  }

  _getContents(_cssParser=cssParser) {
    return new Promise((resolve, reject) => {
      try {
        var ast = _cssParser.parse(this.contents, {source: this.filename});
        return resolve(ast);
      } catch (e) {
        if (!e.reason || e instanceof Error === false) {
          return reject(e);
        } else {
          this.validatorMessages.push(Object.assign({}, CSS_SYNTAX_ERROR, {
            type: VALIDATION_ERROR,
            // Use the reason for the error as the message.
            message: e.reason,
            column: e.column,
            line: e.line,
            file: e.filename,
          }));
        }

        // A syntax error has been encounted so it's game over.
        return resolve(null);
      }
    });
  }

}
