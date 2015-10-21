import { readFileSync } from 'fs';

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

  it('should have updated rules.md with new message codes', () => {
    var markdown = readFileSync('docs/rules.md', 'utf8');
    for (let message in messages) {
      var code = messages[message].code;
      if (code) {
        // Asserting using indexOf rather than assert.include
        // to avoid inclusion of the whole rules.md as part
        // of the error.
        assert.ok(markdown.indexOf(code) > -1,
                  `code ${code} is not present in rules.md`);
      }
    }
  });

});


