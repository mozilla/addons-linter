import { VALIDATION_WARNING } from 'const';
import * as messages from 'messages';


export function warnOnInline($, filename) {
  return new Promise((resolve) => {
    const linterMessages = [];
    $('script').each((i, element) => {
      if ($(element).attr('src') === undefined) {
        linterMessages.push(
          Object.assign({}, messages.INLINE_SCRIPT, {
            /* This could occur in any HTML file, so let's make it
             * a warning in case they've included any other file.
             */
            type: VALIDATION_WARNING,
            file: filename,
          }));
      }
    });
    resolve(linterMessages);
  });
}
