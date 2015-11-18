import path from 'path';
import { existsSync, readdirSync } from 'fs';

import { ESLINT_RULE_MAPPING } from 'const';
import * as jsRules from 'rules/javascript';
import { ignorePrivateFunctions, singleLineString } from 'utils';


describe('Eslint rules object', () => {
  it('should have keys that match the file names', () => {
    for (let jsRule in ignorePrivateFunctions(jsRules)) {
      var jsFilePath = path.join('src/rules/javascript/', `${jsRule}.js`);
      assert.ok(existsSync(jsFilePath),
                `key "${jsRule}" doesn't exist at "${jsFilePath}"`);
    }
  });

  it('should have files that match the keys', () => {
    var files = readdirSync('src/rules/javascript')
      .filter((fileName) => fileName !== 'index.js');
    for (let fileName of files) {
      assert.ok(ESLINT_RULE_MAPPING.hasOwnProperty(path.parse(fileName).name),
                singleLineString`fileName "${fileName}" does not have a
                matching key in the eslint rules object.`);
    }
  });
});
