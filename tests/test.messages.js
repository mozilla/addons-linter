import { readFileSync } from 'fs';

import * as messages from 'messages';
import { BANNED_IDENTIFIERS } from 'const';
import { singleLineString } from 'utils';


describe('Messages', function() {

  for (let message in messages) {
    const code = messages[message].code;
    const description = messages[message].description;
    const msg = messages[message].message;

    if (code) {
      it(`should have code length <= 25 for ${code}`, () => {
        // Otherwise the ansi color sequences will be borked
        // as columnify doesn't handle them when wrapping text.
        assert.isBelow(code.length, 26, `code ${code} is too long`);
      });
    }

    if (description) {
      it(`should not have any newlines in description for ${code}`, () => {
        assert.equal(description.split('\n').length, 1,
                     `The description for ${code} should not have newlines`);
      });
    }

    if (msg) {
      it(`should not have any newlines in message for ${code}`, () => {
        assert.equal(msg.split('\n').length, 1,
                     `The message for ${code} should not have newlines`);
      });
    }
  }

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

  it('should have a legacyCode property in every message', () => {
    for (let message in messages) {
      if (typeof messages[message] === 'object' && !message.startsWith('_')) {
        var legacyCode = messages[message].legacyCode;
        if ((legacyCode instanceof Array && legacyCode.length !== 3) ||
            (!(legacyCode instanceof Array) && legacyCode !== null)) {
          assert.fail(null, null, singleLineString`A valide legacyCode could
            not be found for code: "${messages[message].code}". Should be
            an Array with 3 values based on the amo-validator err_id or null.
            A null value is an explicit way to say the old err_id tuple is not
            useful e.g. a matching code doesn't exist or it's not unique.`);
        }
      }
    }
  });

  it('should have banned_id keys in the _BANNED_IDENTIFIERS_MAP', () => {
    for (let bannedIdentifier of BANNED_IDENTIFIERS) {
      var bannedIdentifierMap = messages._BANNED_IDENTIFIERS_MAP;
      assert.ok(bannedIdentifierMap.hasOwnProperty(bannedIdentifier),
        singleLineString`_BANNED_IDENTIFIERS_MAP should have a
        description for key "${bannedIdentifier}"`);
    }
  });

  it('should have banned_id keys as constants', () => {
    for (let bannedIdentifier of BANNED_IDENTIFIERS) {
      var key = `BANNED_${bannedIdentifier.toUpperCase()}`;
      assert.ok(messages.hasOwnProperty(key),
                `"${key}" doesn't exist in messages module.`);
    }
  });

});


