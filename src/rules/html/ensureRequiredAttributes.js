import { HTML_TAGS_WITH_REQUIRED_ATTRIBUTES, VALIDATION_ERROR } from 'const';
import * as messages from 'messages';


export var ensureRequiredAttributes = ($, filename=null) => {
  return new Promise((resolve) => {
    var validatorMessages = [];

    for (let tag in HTML_TAGS_WITH_REQUIRED_ATTRIBUTES) {
      validatorMessages = validatorMessages.concat(
        _ensureAttributesInTag($, tag, HTML_TAGS_WITH_REQUIRED_ATTRIBUTES[tag],
                               filename));
    }

    resolve(validatorMessages);
  });
};

export var _ensureAttributesInTag = ($, tag, attributes, filename=null) => {
  var validatorMessages = [];

  $(tag).each((i, element) => {
    for (let attributeName of attributes) {
      var errorCode = `${tag}_REQUIRES_${attributeName}`.toUpperCase();

      if ($(element).attr(attributeName) === undefined) {
        validatorMessages.push({
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

  return validatorMessages;
};
