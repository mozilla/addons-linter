import path from 'path';
import { existsSync, readdirSync } from 'fs';

import { ESLINT_RULE_MAPPING } from 'linter/const';
import { ignorePrivateFunctions } from 'linter/utils';
import * as jsRules from 'rules/javascript';

describe('Eslint rules object', () => {
  it('should have keys that match the file names', () => {
    Object.keys(ignorePrivateFunctions(jsRules)).forEach((jsRule) => {
      const jsFilePath = path.join('src/rules/javascript/', `${jsRule}.js`);
      expect(existsSync(jsFilePath)).toBeTruthy();
    });
  });

  it('should have files that match the keys', () => {
    const files = readdirSync('src/rules/javascript').filter(
      (fileName) => fileName !== 'index.js'
    );
    files.forEach((fileName) => {
      expect(
        Object.prototype.hasOwnProperty.call(
          ESLINT_RULE_MAPPING,
          path.parse(fileName).name
        )
      ).toBe(true);
    });
  });
});
