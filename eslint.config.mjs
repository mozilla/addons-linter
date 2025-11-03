import { defineConfig, globalIgnores } from 'eslint/config';
import amoBaseConfig from 'eslint-config-amo/base.js';
import amoPlugin from 'eslint-plugin-amo';
import globals from 'globals';
import babelParser from '@babel/eslint-parser';

export default defineConfig([
  globalIgnores([
    '**/coverage',
    '**/dist',
    '**/eslint.config.mjs',
    '**/locale/',
    '**/vendor/',
    'scripts/download-import-tag',
    'scripts/list-firefox-tags',
    'scripts/run-l10n-extraction',
    'scripts/smoke-test-eslint-version-conflicts',
    'scripts/webext-test-functional',
    'src/schema/imported/index.js',
    'tests/**/*.json',
    'tests/fixtures/**/*',
    'tests/fixtures/de.js',
    'tests/fixtures/fr.js',
    'tests/fixtures/ja.js',
  ]),
  {
    extends: [amoBaseConfig],

    plugins: {
      amo: amoPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },

      parser: babelParser,
    },

    settings: {
      'import/resolver': {
        node: {
          // This adds ./src and ./vendor for relative imports.
          moduleDirectory: ['node_modules', 'src', 'vendor'],
        },
      },
    },

    rules: {
      // This project uses `console.log()`.
      'no-console': 'off',
      'amo/i18n-no-tagged-templates': 'error',
    },
  },
]);
