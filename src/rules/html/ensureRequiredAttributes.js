import { HTML_TAGS_WITH_REQUIRED_ATTRIBUTES, VALIDATION_ERROR } from 'const';
import * as messages from 'messages';


export function ensureRequiredAttributes($, filename) {
  return new Promise((resolve) => {
    var linterMessages = [];

    for (let tag in HTML_TAGS_WITH_REQUIRED_ATTRIBUTES) {
      linterMessages = linterMessages.concat(
        _ensureAttributesInTag($, tag, HTML_TAGS_WITH_REQUIRED_ATTRIBUTES[tag],
                               filename));
    }

    resolve(linterMessages);
  });
}

export function _ensureAttributesInTag($, tag, attributes, filename) {
  var linterMessages = [];

  $(tag).each((i, element) => {
    for (let attributeName of attributes) {
      var errorCode = `${tag}_REQUIRES_${attributeName}`.toUpperCase();

      if ($(element).attr(attributeName) === undefined) {
        linterMessages.push({
          code: errorCode,
          message: messages[errorCode].message,
          description: messages[errorCode].description,
          sourceCode: `<${tag}>`,
          file: filename,
          type: VALIDATION_ERROR,
        });
      }
    }
  });

  return linterMessages;
}
