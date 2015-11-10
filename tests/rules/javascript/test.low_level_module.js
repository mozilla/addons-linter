import { LOW_LEVEL_MODULES,
         VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('low_level_module', () => {

  for (let module of LOW_LEVEL_MODULES) {

    it(`should catch require of ${module} as literal`, () => {
      var code = `require("${module}");`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');
      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       messages.LOW_LEVEL_MODULE.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });

    it(`should catch require of "${module}" as var`, () => {
      var code = `var modPath = '${module}';
      var whatever = require(modPath);`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       messages.LOW_LEVEL_MODULE.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });

    it(`should catch require() first arg "${module}" being a global`, () => {
      var code = `modPath = '${module}';
      require(modPath);`;
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 1);
          assert.equal(validationMessages[0].code,
                       messages.UNEXPECTED_GLOGAL_ARG.code);
          assert.equal(validationMessages[0].type, VALIDATION_WARNING);
        });
    });
  }
});
