import { oneLine } from 'common-tags';

import { VALIDATION_WARNING } from 'const';
import { DEPRECATED_ENTITIES } from 'rules/javascript/deprecated-entities';
import JavaScriptScanner from 'scanners/javascript';

import { runJsScanner } from '../../helpers';

describe('deprecated_entities', () => {
  DEPRECATED_ENTITIES.forEach((entity) => {
    const obj = entity.object;
    const prop = entity.property;

    it(`should warn about using ${obj}.${prop}()`, async () => {
      const code = `${obj}.${prop}();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      linterMessages.sort();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(entity.error.code);
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });

    it(`should know when a variable references ${obj}`, async () => {
      const code = oneLine`var foo = ${obj};
        foo.${prop}();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(entity.error.code);
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });

    it(`should still work with variables aliased to ${obj}.${prop}`, async () => {
      const code = `var foo = ${obj}.${prop}; foo();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(entity.error.code);
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    });

    it('should not warn about using other member functions', async () => {
      const code = `${obj}.doNothing();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });

    it(`should not warn about calling ${prop} in general`, async () => {
      const code = `foo.${prop}();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });

    it(`should not warn about calling ${prop} to a non-global ${obj}`, async () => {
      const code = `foo.${obj}.${prop}();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });

    it(`should not warn about calling ${prop} to non member of ${obj}`, async () => {
      const code = `${obj}.foo.${prop}();`;
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });
  });
});
