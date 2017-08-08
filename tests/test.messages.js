/* eslint-disable import/namespace */
import { readFileSync } from 'fs';

import * as messages from 'messages';


describe('Messages', () => {
  Object.keys(messages).forEach((message) => {
    const code = messages[message].code;
    const description = messages[message].description;
    const msg = messages[message].message;

    if (typeof messages[message] === 'object') {
      it('should have a code set', () => {
        expect(code).not.toEqual(null);
      });

      it(`should have code length <= 25 for ${code}`, () => {
        // Otherwise the ansi color sequences will be borked
        // as columnify doesn't handle them when wrapping text.
        expect(code.length).toBeLessThan(26);
      });
    }

    if (description) {
      it(`should not have any newlines in description for ${code}`, () => {
        expect(description.split('\n').length).toEqual(1);
      });
    }

    if (msg) {
      it(`should not have any newlines in message for ${code}`, () => {
        expect(msg.split('\n').length).toEqual(1);
      });
    }
  });

  it('should construct a valid message (with uppercase codes)', () => {
    const vegetarianTag = messages._tagNotAllowed('steak');
    const teslaTag = messages._tagObsolete('petrol');

    expect(vegetarianTag.code).toEqual('TAG_NOT_ALLOWED_STEAK');
    expect(vegetarianTag.message).toContain('steak');
    expect(vegetarianTag.description).toContain('steak');

    expect(teslaTag.code).toEqual('TAG_OBSOLETE_PETROL');
    expect(teslaTag.message).toContain('petrol');
    expect(teslaTag.description).toContain('petrol');
  });

  it('should have updated rules.md with new message codes', () => {
    const markdown = readFileSync('docs/rules.md', 'utf8');
    Object.keys(messages).forEach((message) => {
      const code = messages[message].code;
      if (code) {
        // Asserting using indexOf rather than assert.include
        // to avoid inclusion of the whole rules.md as part
        // of the error.
        expect(markdown.indexOf(code) > -1).toBeTruthy();
      }
    });
  });

  it('should have a legacyCode property in every message', () => {
    Object.keys(messages).forEach((message) => {
      if (typeof messages[message] === 'object' && !message.startsWith('_')) {
        const legacyCode = messages[message].legacyCode;
        if ((legacyCode instanceof Array && legacyCode.length !== 3) ||
            (!(legacyCode instanceof Array) && legacyCode !== null)) {
          expect(false).toBe(true);
        }
      }
    });
  });
});
