/* eslint-disable import/namespace */
import { readFileSync } from 'fs';

import * as messages from 'messages';


describe('Messages', () => {
  Object.keys(messages).forEach((message) => {
    const { code, description, msg } = messages[message];

    if (typeof messages[message] === 'object' && code !== undefined) {
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

  it('should have updated rules.md with new message codes', () => {
    const markdown = readFileSync('docs/rules.md', 'utf8');
    Object.keys(messages).forEach((message) => {
      const { code } = messages[message];
      if (code) {
        // Asserting using indexOf rather than assert.include
        // to avoid inclusion of the whole rules.md as part
        // of the error.
        expect(markdown.indexOf(code) > -1).toBeTruthy();
      }
    });
  });
});
