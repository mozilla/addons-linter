import path from 'path';
import { existsSync, readdirSync } from 'fs';

import { ESLINT_RULE_MAPPING } from 'const';
import * as jsRules from 'rules/javascript';
import { ignorePrivateFunctions } from 'utils';


describe('Eslint rules object', () => {
  it('should have keys that match the file names', () => {
    for (let jsRule in ignorePrivateFunctions(jsRules)) {
      var jsFilePath = path.join('src/rules/javascript/', `${jsRule}.js`);
      expect(existsSync(jsFilePath)).toBeTruthy();
    }
  });

  it('should have files that match the keys', () => {
    var files = readdirSync('src/rules/javascript')
      .filter((fileName) => fileName !== 'index.js');
    for (let fileName of files) {
      expect(
        ESLINT_RULE_MAPPING.hasOwnProperty(path.parse(fileName).name)
      ).toBeTruthy();
    }
  });
});
