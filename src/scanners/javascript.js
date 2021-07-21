/* global appRoot */
import path from 'path';

import ESLint from 'eslint';
import { oneLine } from 'common-tags';
import * as espree from 'espree';
import vk from 'eslint-visitor-keys';
import { ECMA_VERSION } from 'addons-scanner-utils/dist/const';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import { ensureFilenameExists } from 'utils';

const IGNORE_FILE = 'addons-linter.eslintignore';

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
    const detectedSourceType = this.detectSourceType(this.filename);
    this.sourceType = detectedSourceType.sourceType;

    const rules = {};
    Object.keys(_ruleMapping).forEach((ruleName) => {
      if (!this.disabledRules.includes(ruleName)) {
        rules[ruleName] = _ruleMapping[ruleName];
        this._rulesProcessed++;
      }
    });

    const root =
      typeof appRoot !== 'undefined' ? appRoot : path.join(__dirname, '..');
    const eslintConfig = {
      resolvePluginsRelativeTo: path.resolve(root),
      // The default value for `rulePaths` is configured so that it finds the
      // files exported by webpack when this project is built.
      rulePaths: _rulePaths || [path.join(root, 'dist', 'rules', 'javascript')],
      allowInlineConfig: false,

      // Avoid loading the addons-linter .eslintrc file
      useEslintrc: false,

      // Avoid loading the .eslintignore file from the cwd
      // by explicitly configuring eslint with a custom ignore file
      // packaged with the addons-linter npm package.
      ignorePath: path.join(path.resolve(root), IGNORE_FILE),

      baseConfig: {
        env: {
          browser: true,
          es6: true,
          webextensions: true,
        },

        // It's the default but also shouldn't change since we're using
        // espree to parse javascript files below manually to figure out
        // if they're modules or not
        parser: 'espree',
        parserOptions: {
          ecmaVersion: ECMA_VERSION,
          sourceType: this.sourceType,
        },

        rules,
        plugins: ['no-unsanitized'],

        // Scan files in `node_modules/` as well as dotfiles. As of ESLInt 7.0,
        // bower files are scanned.
        // See: https://github.com/mozilla/addons-linter/issues/1288
        // See: https://eslint.org/docs/user-guide/migrating-to-7.0.0#default-ignore-patterns-have-changed
        ignorePatterns: ['!node_modules/*', '!.*'],
        settings: {
          addonMetadata: this.options.addonMetadata,
          existingFiles: this.options.existingFiles,
        },
      },
    };

    const cli = new _ESLint.ESLint(eslintConfig);
    const results = await cli.lintText(this.code, {
      filePath: this.filename,
      warnIgnored: true,
    });

    // eslint prepends the filename with the current working directory,
    // strip that out.
    this.scannedFiles.push(this.filename);

    results.forEach((result) => {
      result.messages.forEach((message) => {
        let extraShortDescription = '';

        // Fatal error messages (like SyntaxErrors) are a bit different, we
        // need to handle them specially. Messages related to parsing errors do
        // not have a `ruleId`, which is why we check that, too.
        if (message.fatal === true && message.ruleId === null) {
          // If there was a parsing error during the sourceType detection, we
          // want to add it to the short description. We start by adding it to
          // a temporary variable in case there are other messages we want to
          // append to the final short description (which will be the `message`
          // in the final output).
          if (detectedSourceType.parsingError !== null) {
            const { type, error } = detectedSourceType.parsingError;
            extraShortDescription = `(Parsing as ${type} error: ${error})`;
          }

          // If there was another error, we want to append it to the short
          // description as well. `message.message` will contain the full
          // exception message, which likely includes a prefix that we don't
          // want to keep.
          const formattedError = message.message.replace('Parsing error: ', '');
          extraShortDescription = [
            extraShortDescription,
            oneLine`(Parsing as ${this.sourceType} error: ${formattedError} at
              line: ${message.line} and column: ${message.column})`,
          ].join(' ');
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

        if (extraShortDescription.length) {
          shortDescription += ` ${extraShortDescription}`;
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
        } else if (child) {
          return this._getSourceType(child);
        }
      }
    }

    return 'script';
  }

  /*
    Analyze the source-code by naively parsing the source code manually and
    checking for module syntax errors in order to determine the source type of
    the file.

    This function returns an object with the source type (`script` or `module`)
    and a non-null parsing error object when parsing has failed with the default
    source type. The parsing error object contains the `error` message and the
    source `type`.
  */
  detectSourceType(filename) {
    // Default options taken from eslint/lib/linter:parse
    const parserOptions = {
      filePath: filename,
      sourceType: 'module',
      ecmaVersion: ECMA_VERSION,
    };

    const detected = {
      sourceType: 'module',
      parsingError: null,
    };

    try {
      const ast = espree.parse(this.code, parserOptions);
      detected.sourceType = filename.endsWith('.mjs')
        ? 'module'
        : this._getSourceType(ast);
    } catch (exc) {
      const line = exc.lineNumber || '(unknown)';
      const column = exc.column || '(unknown)';
      let error = `${exc.message} at line: ${line} and column: ${column}`;

      // When there is no line/column, it likely means something went wrong in
      // our code (`_getSourceType()`) and we should know about it so we append
      // a comment to hopefully get new bug reports.
      if (!exc.lineNumber || !exc.column) {
        error = oneLine`${error}. This looks like a bug in addons-linter,
          please open a new issue:
          https://github.com/mozilla/addons-linter/issues`;
      }

      detected.sourceType = 'script';
      detected.parsingError = { type: parserOptions.sourceType, error };
    }

    return detected;
  }
}
