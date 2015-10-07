import * as messages from 'messages';

describe('Messages', function() {

  it('should only have codes with a length < 25', () => {
    // Otherwise the ansi color sequences will be borked
    // as columnify doesn't handle them when wrapping text.
    for (let message in messages) {
      var code = messages[message].code;
      if (code) {
        assert.isBelow(code.length, 26, `code ${code} is too long`);
      }
    }
  });

});
