import { VALIDATION_WARNING } from 'linter/const';
import * as messages from 'messages';
import CSSScanner from 'scanners/css';

describe('CSS Rule General', () => {
  it("Check bogus comments don't break parser", async () => {
    // This code was reported upstream as causing the previous
    // parser to hang. Check we handle it.
    const code = `//*-
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

    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].message).toEqual('Unclosed comment');
    expect(linterMessages[0].code).toEqual(messages.CSS_SYNTAX_ERROR.code);
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });
});
