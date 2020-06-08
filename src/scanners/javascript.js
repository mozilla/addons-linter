/* global appRoot */
import path from 'path';

import ESLint from 'eslint';
import { oneLine } from 'common-tags';
import espree from 'espree';
import vk from 'eslint-visitor-keys';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import { ensureFilenameExists } from 'utils';

const ECMA_VERSION = 2019;

export default class JavaScriptScanner {
  disabledRules = [];

  constructor(code, filename, options = {}) {
    this.code = code;
    this.filename = filename;
    this.options = options;
    this.linterMessages = [];
    this.scannedFiles = [];
    this._rulesProcessed = 0;
    this.disabledRules =
      typeof options.disabledRules === 'string'
        ? options.disabledRules
            .split(',')
            .map((rule) => rule.trim())
            .filter((notEmptyRule) => notEmptyRule)
        : [];
    ensureFilenameExists(this.filename);
  }

  static get fileResultType() {
    return 'string';
  }

  static get scannerName() {
    return 'javascript';
  }

  async scan({
    _ESLint = ESLint,
    _messages = messages,
    _ruleMapping = ESLINT_RULE_MAPPING,
    // This tells ESLint where to expect the ESLint rules for addons-linter.
    // Its default value is defined below. This property is mainly used for
    // testing purposes.
    _rulePaths = undefined,
  } = {}) {
    this.sourceType = this.detectSourceType(this.filename);

    const rules = {};
    Object.keys(_ruleMapping).forEach((ruleName) => {
      if (!this.disabledRules.includes(ruleName)) {
        rules[ruleName] = _ruleMapping[ruleName];
        this._rulesProcessed++;
      }
    });

    const eslintConfig = {
      envs: ['es6', 'webextensions', 'browser'],
      // It's the default but also shouldn't change since we're using
      // espree to parse javascript files below manually to figure out
      // if they're modules or not
      parser: 'espree',
      parserOptions: {
        ecmaVersion: ECMA_VERSION,
        sourceType: this.sourceType,
      },
      rules,
      // The default value for `rulePaths` is configured so that it finds the
      // files exported by webpack when this project is built.
      rulePaths: _rulePaths || [
        path.join(appRoot, 'dist', 'rules', 'javascript'),
      ],
      plugins: ['no-unsanitized'],
      allowInlineConfig: false,

      // Disable ignore-mode and overwrite eslint default ignore patterns
      // so an add-on's bower and node module folders are included in
      // the scan. See: https://github.com/mozilla/addons-linter/issues/1288
      ignore: false,
      patterns: ['!bower_components/*', '!node_modules/*'],

      // Avoid loading the addons-linter .eslintrc file
      useEslintrc: false,

      baseConfig: {
        settings: {
          addonMetadata: this.options.addonMetadata,
          existingFiles: this.options.existingFiles,
        },
      },
    };

    const cli = new _ESLint.CLIEngine(eslintConfig);
    const { results } = cli.executeOnText(this.code, this.filename, true);

    // eslint prepends the filename with the current working directory,
    // strip that out.
    this.scannedFiles.push(this.filename);

    results.forEach((result) => {
      result.messages.forEach((message) => {
        // Fatal error messages (like SyntaxErrors) are a bit different, we
        // need to handle them specially.
        if (message.fatal === true) {
          // eslint-disable-next-line no-param-reassign
          message.message = _messages.JS_SYNTAX_ERROR.code;
        }

        if (typeof message.message === 'undefined') {
          throw new Error(
            oneLine`JS rules must pass a valid message as
            the second argument to context.report()`
          );
        }

        // Fallback to looking up the message object by the message
        let code = message.message;
        let shortDescription;
        let description;

        // Support 3rd party eslint rules that don't have our internal
        // message structure and allow us to optionally overwrite
        // their `message` and `description`.
        if (Object.prototype.hasOwnProperty.call(_messages, code)) {
          ({ message: shortDescription, description } = _messages[code]);
        } else if (
          Object.prototype.hasOwnProperty.call(
            messages.ESLINT_OVERWRITE_MESSAGE,
            message.ruleId
          )
        ) {
          const overwrites = messages.ESLINT_OVERWRITE_MESSAGE[message.ruleId];
          shortDescription = overwrites.message || message.message;
          description = overwrites.description || message.description;

          if (overwrites.code) {
            code = overwrites.code;
          }
        } else {
          shortDescription = code;
          description = null;
        }

        this.linterMessages.push({
          code,
          column: message.column,
          description,
          file: this.filename,
          line: message.line,
          message: shortDescription,
          sourceCode: message.source,
          type: ESLINT_TYPES[message.severity],
        });
      });
    });

    return {
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    };
  }

  _getSourceType(node) {
    const possibleImportExportTypes = [
      'ExportAllDeclaration',
      'ExportDefaultDeclaration',
      'ExportNamedDeclaration',
      'ExportSpecifier',
      'ImportDeclaration',
      'ImportDefaultSpecifier',
      'ImportNamespaceSpecifier',
      'ImportSpecifier',
    ];

    if (possibleImportExportTypes.includes(node.type)) {
      return 'module';
    }

    const keys = vk.KEYS[node.type];

    if (keys.length >= 1) {
      for (let i = 0; i < keys.length; ++i) {
        const child = node[keys[i]];

        if (Array.isArray(child)) {
          for (let j = 0; j < child.length; ++j) {
            if (this._getSourceType(child[j]) === 'module') {
              return 'module';
            }
          }
        } else {
          return this._getSourceType(child);
        }
      }
    }

    return 'script';
  }

  /*
    Analyze the source-code by by parsing the source code manually and
    check for import/export syntax errors.

    This returns `script` or `module`.
  */
  detectSourceType(filename) {
    // Default options taken from eslint/lib/linter:parse
    const parserOptions = {
      filePath: filename,
      sourceType: 'module',
      ecmaVersion: ECMA_VERSION,
    };

    let sourceType = 'module';

    try {
      const ast = espree.parse(this.code, parserOptions);
      sourceType = this._getSourceType(ast);
    } catch (exc) {
      sourceType = 'script';
    }

    return sourceType;
  }
}
