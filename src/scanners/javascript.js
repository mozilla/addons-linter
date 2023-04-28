import ESLint from 'eslint';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import { oneLine } from 'common-tags';
import * as espree from 'espree';
import * as vk from 'eslint-visitor-keys';
import { ECMA_VERSION } from 'addons-scanner-utils/dist/const';

import { ESLINT_RULE_MAPPING, ESLINT_TYPES } from 'const';
import * as messages from 'messages';
import { ensureFilenameExists } from 'utils';

import customEslintRules from '../rules/javascript';

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
    // This property is used to inject additional custom eslint rules
    // as part of tests.
    _rules = undefined,
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

    const linter = new _ESLint.Linter();

    // Load additional rules injected by unit tests.
    if (_rules) {
      for (const ruleName of Object.keys(_rules)) {
        linter.defineRule(ruleName, _rules[ruleName]);
      }
    }

    // Load custom eslint rules embedded into addons-linter bundle.
    for (const key of Object.keys(customEslintRules)) {
      linter.defineRule(key, customEslintRules[key]);
    }

    // Load plugins rules.
    const pluginRules = noUnsanitized.rules;
    for (const key of Object.keys(pluginRules)) {
      linter.defineRule(`no-unsanitized/${key}`, pluginRules[key]);
    }

    linter.defineParser('addons-linter-espree', espree);

    const eslintConfig = {
      env: {
        browser: true,
        es6: true,
        webextensions: true,
      },

      // Ensure we use the same parser and parserOptions used to detect
      // the sourceType.
      parser: 'addons-linter-espree',
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
        privileged: this.options.privileged,
      },
    };

    const results = linter.verify(this.code, eslintConfig, {
      allowInlineConfig: false,
      filename: this.filename,
    });

    // eslint prepends the filename with the current working directory,
    // strip that out.
    this.scannedFiles.push(this.filename);

    results.forEach((message) => {
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

    return {
      linterMessages: this.linterMessages,
      scannedFiles: this.scannedFiles,
    };
  }

  _getSourceType(node, topLevel) {
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
    const functionTypes = [
      'ArrowFunctionExpression',
      'FunctionDeclaration',
      'FunctionExpression',
    ];

    if (
      possibleImportExportTypes.includes(node.type) ||
      (topLevel && node.type === 'AwaitExpression')
    ) {
      return 'module';
    }

    const stayTopLevel = topLevel && !functionTypes.includes(node.type);

    const keys = vk.KEYS[node.type];

    if (keys.length >= 1) {
      for (let i = 0; i < keys.length; ++i) {
        const child = node[keys[i]];

        if (Array.isArray(child)) {
          for (let j = 0; j < child.length; ++j) {
            if (
              child[j] &&
              this._getSourceType(child[j], stayTopLevel) === 'module'
            ) {
              return 'module';
            }
          }
        } else if (
          child &&
          this._getSourceType(child, stayTopLevel) === 'module'
        ) {
          return 'module';
        }
      }
    }

    return 'script';
  }

  detectSourceType() {
    /*
     * Analyze the source-code by naively parsing the source code manually and
     * checking for module syntax errors and/or some features in the source code
     * in order to determine the source type of the file.
  
     * This function returns an object with the source type (`script` or
     * `module`) and a non-null parsing error object when parsing has failed with
     * the default source type. The parsing error object contains the `error`
     * message and the source `type`.
    */
    // Default options taken from eslint/lib/linter:parse
    const parserOptions = {
      filePath: this.filename,
      sourceType: 'module',
      ecmaVersion: ECMA_VERSION,
    };

    const detected = {
      sourceType: 'module',
      parsingError: null,
    };

    try {
      const ast = espree.parse(this.code, parserOptions);
      detected.sourceType =
        this.filename.endsWith('.mjs') || this.code.includes('import.meta')
          ? 'module'
          : this._getSourceType(ast, true);
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
