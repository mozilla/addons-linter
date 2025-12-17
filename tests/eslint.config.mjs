import { defineConfig } from 'eslint/config';

import rootConfig from '../eslint.config.mjs';

export default defineConfig([
  rootConfig,
  {
    languageOptions: {
      globals: {
        assert: true,
        sinon: true,
      },
    },

    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
        },
      ],

      'jest/expect-expect': [
        'warn',
        {
          assertFunctionNames: [
            'expect',
            'sinon.assert.*',
            'assertHasMatchingError',
            'checkMinNodeVersion',
          ],
        },
      ],
    },
  },
]);
