import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import * as messages from 'messages';


describe('banned_identifiers', () => {

  it('should catch newThread', () => {
    var code = `var y = newThread;
      var x = foo.newThread;
      var w = foo["newThread"];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 3);
        assert.equal(validationMessages[0].code,
                     messages.BANNED_NEWTHREAD.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

  it('should catch processNextEvent', () => {
    var code = `var y = processNextEvent;
      var x = foo.processNextEvent;
      var w = foo["processNextEvent"];`;
    var jsScanner = new JavaScriptScanner(code, 'badcode.js');

    return jsScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 3);
        assert.equal(validationMessages[0].code,
                     messages.BANNED_PROCESSNEXTEVENT.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });

});
