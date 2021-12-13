import path from 'path';
import { readdirSync } from 'fs';

import { ESLINT_RULE_MAPPING } from 'const';

describe('Eslint rules object', () => {
  const files = readdirSync('src/rules/javascript').filter(
    (fileName) => fileName !== 'index.js'
  );

  it.each(files)(
    '%s rule module should have a matching rule mapping',
    (fileName) => {
      expect(
        Object.prototype.hasOwnProperty.call(
          ESLINT_RULE_MAPPING,
          path.parse(fileName).name
        )
      ).toBe(true);
    }
  );

  it.each(files)(
    '%s rule module should be exported by the index.js module',
    async (fileName) => {
      const modName = path.parse(fileName).name;
      const indexMod = (await import('rules/javascript')).default;
      const ruleMod = (await import(`rules/javascript/${fileName}`)).default;
      expect(typeof indexMod[modName]?.create).toBe('function');
      expect(indexMod[modName]).toBe(ruleMod);
    }
  );
});
