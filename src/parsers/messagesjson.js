import RJSON from 'relaxed-json';

import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { MESSAGES_JSON, MESSAGE_PLACEHOLDER_REGEXP } from 'const';
import { validateMessages } from 'schema/validator';
import log from 'logger';

export default class MessagesJSONParser extends JSONParser {
  constructor(jsonString, collector, {
    filename = MESSAGES_JSON, RelaxedJSON = RJSON,
  } = {}) {
    super(jsonString, collector, { filename });
    this.relaxedJSON = RelaxedJSON;
  }

  parse() {
    super.parse(this.relaxedJSON);

    // Set up some defaults in case parsing fails.
    if (typeof this.parsedJSON === 'undefined' || this.isValid === false) {
      this.parsedJSON = {};
    } else {
      // We've parsed the JSON; now we can validate the manifest.
      this._validate();
    }
  }

  errorLookup(error) {
    // This is the default message.
    let baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      const lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should not have additional properties') {
        // eslint-disable-next-line no-param-reassign
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    const overrides = {
      dataPath: error.dataPath,
      file: this.filename,
    };

    // Missing the message property.
    if (error.keyword === 'required') {
      if (error.params.missingProperty === 'message') {
        baseObject = messages.NO_MESSAGE;
      } else if (error.params.missingProperty === 'content') {
        baseObject = messages.NO_PLACEHOLDER_CONTENT;
      }
    } else if (error.keyword === 'additionalProperties') {
      if (error.schemaPath === '#/additionalProperties') {
        baseObject = messages.INVALID_MESSAGE_NAME;
      } else if (error.schemaPath === '#/properties/placeholders/additionalProperties') {
        baseObject = messages.INVALID_PLACEHOLDER_NAME;
      }
    }

    return Object.assign({}, baseObject, overrides);
  }

  hasPlaceholder(message, placeholder) {
    const messageObj = this.parsedJSON[message];
    return 'placeholders' in messageObj &&
           placeholder in messageObj.placeholders;
  }

  _validate() {
    this.isValid = validateMessages(this.parsedJSON);
    if (!this.isValid) {
      log.debug('Schema Validation messages', validateMessages.errors);

      validateMessages.errors.forEach((error) => {
        const message = this.errorLookup(error);
        this.collector.addError(message);
      });
    }

    const regexp = new RegExp(MESSAGE_PLACEHOLDER_REGEXP, 'ig');
    Object.keys(this.parsedJSON).forEach((message) => {
      if (message.startsWith('@@')) {
        this.collector.addWarning(Object.assign({
          file: this.filename,
        }, messages.PREDEFINED_MESSAGE_NAME));
      }

      const messageContent = this.parsedJSON[message].message;
      let matches = regexp.exec(messageContent);
      while (matches !== null) {
        if (!this.hasPlaceholder(message, matches[1])) {
          this.collector.addWarning(Object.assign({
            file: this.filename,
          }, messages.MISSING_PLACEHOLDER));
        }
        matches = regexp.exec(messageContent);
      }
      // Reset the regexp
      regexp.lastIndex = 0;
    });
  }
}
