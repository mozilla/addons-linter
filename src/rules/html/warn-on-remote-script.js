import { VALIDATION_WARNING } from 'const';
import { isStrictRelativeUrl } from 'schema/formats';
import * as messages from 'messages';


export function warnOnRemoteScript($, filename) {
  return new Promise((resolve) => {
    var linterMessages = [];

    $('script').each((i, element) => {
      const src = $(element).attr('src');

      if (src !== undefined && !isStrictRelativeUrl(src)) {
        linterMessages.push(
          Object.assign({}, messages.REMOTE_SCRIPT, {
            type: VALIDATION_WARNING,
            file: filename
          })
        );
      }
    });

    resolve(linterMessages);
  })
}
