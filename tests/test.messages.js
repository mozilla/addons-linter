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

  it('should construct a valid message (with uppercase codes)', () => {
    var vegetarianTag = messages._tagNotAllowed('steak');
    var teslaTag = messages._tagObsolete('petrol');

    assert.equal(vegetarianTag.code, 'TAG_NOT_ALLOWED_STEAK');
    assert.include(vegetarianTag.message, 'steak');
    assert.include(vegetarianTag.description, 'steak');

    assert.equal(teslaTag.code, 'TAG_OBSOLETE_PETROL');
    assert.include(teslaTag.message, 'petrol');
    assert.include(teslaTag.description, 'petrol');
  });

});
