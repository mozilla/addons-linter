import * as postcss from 'postcss';

import BaseScanner from 'scanners/base';
import log from 'logger';
import { CSS_SYNTAX_ERROR } from 'messages';
import { VALIDATION_WARNING } from 'const';
import { ignorePrivateFunctions } from 'utils';
import * as cssRules from 'rules/css';


export default class CSSScanner extends BaseScanner {
  _defaultRules = cssRules;

  static get scannerName() {
    return 'css';
  }

  processCode(cssNode, cssInstruction, _rules = this._defaultRules) {
    const file = this.filename;
    const cssOptions = Object.assign({}, this.options, {
      startLine: cssNode.source.start.line,
      startColumn: cssNode.source.start.column,
    });

    const info = {
      file,
      startLine: cssOptions.startLine,
      startColumn: cssOptions.startColumn,
    };

    if (cssNode.type === 'comment') {
      log.debug('Found CSS comment. Skipping', info);
      return;
    }

    if (cssNode.type === 'atrule') {
      log.debug('Processing media rules');
      if (cssNode.nodes && cssNode.nodes.length) {
        cssNode.nodes.forEach((mediaCssNode) => {
          this.processCode(mediaCssNode, cssInstruction, _rules);
        });
      } else {
        log.debug('No media rules found');
      }
      return;
    }

    log.debug('Passing CSS code to rule function "%s"',
      cssInstruction, info);

    this.linterMessages = this.linterMessages.concat(
      _rules[cssInstruction](cssNode, file, cssOptions));
  }

  scan(_rules = this._defaultRules) {
    return new Promise((resolve, reject) => {
      this.getContents()
        .then((ast) => {
          if (ast && ast.nodes) {
            const rules = ignorePrivateFunctions(_rules);
            const { nodes } = ast;

            Object.keys(rules).forEach((cssInstruction) => {
              this._rulesProcessed++;
              nodes.forEach((cssNode) => {
                this.processCode(cssNode, cssInstruction, rules);
              });
            });
          }

          resolve({
            linterMessages: this.linterMessages,
            scannedFiles: this.scannedFiles,
          });
        })
        .catch(reject);
    });
  }

  _getContents(_cssParser = postcss) {
    return new Promise((resolve, reject) => {
      try {
        const rootNode = _cssParser.parse(this.contents, { from: this.filename });
        return resolve(rootNode);
      } catch (e) {
        if (!e.reason || e.name !== 'CssSyntaxError') {
          return reject(e);
        }
        this.linterMessages.push(Object.assign({}, CSS_SYNTAX_ERROR, {
          type: VALIDATION_WARNING,
          // Use the reason for the error as the message.
          // e.message includes an absolute path.
          message: e.reason,
          column: e.column,
          line: e.line,
          // We use our own ref to the file as postcss outputs
          // absolute paths.
          file: this.filename,
        }));


        // A syntax error has been encounted so it's game over.
        return resolve(null);
      }
    });
  }
}
