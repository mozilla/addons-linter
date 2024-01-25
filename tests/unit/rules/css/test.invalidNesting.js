import { oneLine } from 'common-tags';

import * as messages from 'messages';
import { VALIDATION_WARNING } from 'const';
import CSSScanner from 'scanners/css';

describe('CSS Rule InvalidNesting', () => {
  it('should detect invalid nesting', async () => {
    const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css', {
      addonMetadata: {
        firefoxStrictMinVersion: '60.5',
      },
    });

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(
      messages.INVALID_SELECTOR_NESTING.code
    );
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });

  it('should not report invalid nesting on sufficient version', async () => {
    const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css', {
      addonMetadata: {
        firefoxMinVersion: '117.0.1',
      },
    });

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should not report invalid nesting on minimal allowed version', async () => {
    const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css', {
      addonMetadata: {
        firefoxMinVersion: '117.0.0',
      },
    });

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should not detect invalid nesting', async () => {
    const code = oneLine`/* I'm a comment */
      @media only screen and (max-width: 959px) {
          .something-else {
              height: 100px;
          }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(0);
  });

  it('should detect invalid nesting in @media block', async () => {
    const code = oneLine`/* I'm a comment */
      @media only screen and (max-width: 959px) {
        .foo {
          .something-else {
              height: 100px;
          }
        }
      }`;
    const cssScanner = new CSSScanner(code, 'fakeFile.css');

    const { linterMessages } = await cssScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(
      messages.INVALID_SELECTOR_NESTING.code
    );
    expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
  });
});
