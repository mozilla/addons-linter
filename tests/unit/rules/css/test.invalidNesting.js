import { oneLine } from 'common-tags';

import * as messages from 'messages';
import { VALIDATION_WARNING } from 'const';
import CSSScanner from 'scanners/css';

describe('CSS Rule InvalidNesting', () => {
  it.each(['60.5', '116.0', '116', '116.1', '116.0.1', '116.0.0'])(
    'should detect invalid nesting when firefoxMinVersion=%s',
    async (firefoxMinVersion) => {
      const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
      const cssScanner = new CSSScanner(code, 'fakeFile.css', {
        addonMetadata: {
          firefoxMinVersion,
        },
      });

      const { linterMessages } = await cssScanner.scan();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(
        messages.INVALID_SELECTOR_NESTING.code
      );
      expect(linterMessages[0].type).toEqual(VALIDATION_WARNING);
    }
  );

  it.each(['117', '117.0', '117.1', '117.0.0', '117.0.1'])(
    'should not report invalid nesting when firefoxMinVersion=%s',
    async (firefoxMinVersion) => {
      const code = oneLine`/* I'm a comment */
      #something {
        .bar {
          height: 100px;
        }
      }`;
      const cssScanner = new CSSScanner(code, 'fakeFile.css', {
        addonMetadata: {
          firefoxMinVersion,
        },
      });
      const { linterMessages } = await cssScanner.scan();
      expect(linterMessages.length).toEqual(0);
    }
  );

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
