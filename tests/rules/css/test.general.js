import * as messages from 'messages';

import { VALIDATION_WARNING } from 'const';

import CSSScanner from 'scanners/css';


describe('CSS Rule General', () => {

  it("Check bogus comments don't break parser", () => {
    // This code was reported upstream as causing the previous
    // parser to hang. Check we handle it.
    var code = `//*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-
        //*-`;

    var cssScanner = new CSSScanner(code, 'fakeFile.css');

    return cssScanner.scan()
      .then((validationMessages) => {
        assert.equal(validationMessages.length, 1);
        assert.equal(validationMessages[0].message, 'Unclosed comment');
        assert.equal(validationMessages[0].code,
                     messages.CSS_SYNTAX_ERROR.code);
        assert.equal(validationMessages[0].type, VALIDATION_WARNING);
      });
  });
});
