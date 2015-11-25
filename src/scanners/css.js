import * as cssParser from 'css';
import * as rules from 'rules/css';

import BaseScanner from 'scanners/base';
import log from 'logger';
import { CSS_SYNTAX_ERROR } from 'messages';
import { VALIDATION_ERROR } from 'const';
import { ignorePrivateFunctions } from 'utils';


export default class CSSScanner extends BaseScanner {

  _defaultRules = rules;

  processCode(cssCode, cssInstruction, _rules=this._defaultRules) {
    if (cssCode.type === 'comment') {
      log.debug('Found CSS comment. Skipping');
      return;
    }

    if (cssCode.type === 'media') {
      log.debug('Processing media rules');
      if (cssCode.rules.length) {
        for (let mediaCssCode of cssCode.rules) {
          this.processCode(mediaCssCode, cssInstruction, _rules);
        }
      } else {
        log.debug('No media rules found');
      }
      return;
    }

    var file = cssCode.position.source;
    var cssOptions = Object.assign({}, this.options, {
      startLine: cssCode.position.start.line,
      startColumn: cssCode.position.start.column,
    });

    log.debug('Passing CSS code to rule function "%s"',
      cssInstruction, {
        cssCode: cssCode,
        file: file,
        startLine: cssOptions.startLine,
        startColumn: cssOptions.startColumn,
      });

    this.validatorMessages = this.validatorMessages.concat(
      _rules[cssInstruction](cssCode, file, cssOptions));
  }

  scan(_rules=this._defaultRules) {
    return new Promise((resolve, reject) => {
      this.getContents()
        .then((ast) => {
          if (ast && ast.stylesheet && ast.stylesheet.rules) {
            var rules = ignorePrivateFunctions(_rules);

            for (let cssInstruction in rules) {
              this._rulesProcessed++;
              for (let cssCode of ast.stylesheet.rules) {
                this.processCode(cssCode, cssInstruction, rules);
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
