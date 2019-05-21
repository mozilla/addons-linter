import { VALIDATION_WARNING } from 'linter/const';
import { isStrictRelativeUrl } from 'schema/formats';
import * as messages from 'messages';

export async function warnOnRemoteScript($, filename) {
  const linterMessages = [];

  $('script').each((i, element) => {
    const src = $(element).attr('src');

    if (src !== undefined && !isStrictRelativeUrl(src)) {
      linterMessages.push(
        Object.assign({}, messages.REMOTE_SCRIPT, {
          type: VALIDATION_WARNING,
          file: filename,
        })
      );
    }
  });

  return linterMessages;
}
