import { VALIDATION_WARNING } from 'const';
import * as messages from 'messages';

export async function warnOnInline($, filename) {
  const linterMessages = [];
  $('script').each((i, element) => {
    if (
      $(element).attr('src') === undefined &&
      ($(element).attr('type') === undefined ||
        $(element).attr('type') === 'text/javascript')
    ) {
      linterMessages.push({
        ...messages.INLINE_SCRIPT,
        /* This could occur in any HTML file, so let's make it
         * a warning in case they've included any other file. */
        type: VALIDATION_WARNING,
        file: filename,
      });
    }
  });

  return linterMessages;
}
