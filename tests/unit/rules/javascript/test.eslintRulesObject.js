import path from 'path';
import { readdirSync } from 'fs';

import { ESLINT_RULE_MAPPING } from 'const';

describe('Eslint rules object', () => {
  it('should have files that match the keys', () => {
    const files = readdirSync('src/rules/javascript');
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
