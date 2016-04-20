import * as rules from 'rules/css';
import * as postcss from 'postcss';

import BaseScanner from 'scanners/base';
import log from 'logger';
import { CSS_SYNTAX_ERROR } from 'messages';
import { VALIDATION_ERROR } from 'const';
import { ignorePrivateFunctions } from 'utils';


export default class CSSScanner extends BaseScanner {

  _defaultRules = rules;

  processCode(cssNode, cssInstruction, _rules=this._defaultRules) {

    var file = this.filename;
    var cssOptions = Object.assign({}, this.options, {
      startLine: cssNode.source.start.line,
      startColumn: cssNode.source.start.column,
    });

    var info = {
      file: file,
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
        for (let mediaCssNode of cssNode.nodes) {
          this.processCode(mediaCssNode, cssInstruction, _rules);
        }
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

  scan(_rules=this._defaultRules) {
    return new Promise((resolve, reject) => {
      this.getContents()
        .then((ast) => {
          if (ast && ast.nodes) {
            var rules = ignorePrivateFunctions(_rules);
            var nodes = ast.nodes;

            for (let cssInstruction in rules) {
              this._rulesProcessed++;
              for (let cssNode of nodes) {
                this.processCode(cssNode, cssInstruction, rules);
              }
            }
          }

          resolve(this.linterMessages);
        })
        .catch(reject);
    });
  }

  _getContents(_cssParser=postcss) {
    return new Promise((resolve, reject) => {
      try {
        var rootNode = _cssParser.parse(this.contents, {from: this.filename});
        return resolve(rootNode);
      } catch (e) {
        if (!e.reason || e.name !== 'CssSyntaxError') {
          return reject(e);
        } else {
          this.linterMessages.push(Object.assign({}, CSS_SYNTAX_ERROR, {
            type: VALIDATION_ERROR,
            // Use the reason for the error as the message.
            // e.message includes an absolute path.
            message: e.reason,
            column: e.column,
            line: e.line,
            // We use our own ref to the file as postcss outputs
            // absolute paths.
            file: this.filename,
          }));
        }

        // A syntax error has been encounted so it's game over.
        return resolve(null);
      }
    });
  }
}
