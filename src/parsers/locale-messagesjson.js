import RJSON from '@fregante/relaxed-json';

import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { MESSAGES_JSON, MESSAGE_PLACEHOLDER_REGEXP } from 'const';
import { validateLocaleMessages } from 'schema/validator';
import log from 'logger';

export default class LocaleMessagesJSONParser extends JSONParser {
  constructor(
    jsonString,
    collector,
    addonMetadata,
    { filename = MESSAGES_JSON, RelaxedJSON = RJSON } = {}
  ) {
    super(jsonString, collector, addonMetadata, { filename });
    this.relaxedJSON = RelaxedJSON;
  }

  parse() {
    super.parse(this.relaxedJSON);
    this.lowercasePlaceholders = {};

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

    const overrides = {
      instancePath: error.instancePath,
      line: error.line,
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
      if (
        error.schemaPath === '#/properties/placeholders/additionalProperties'
      ) {
        baseObject = messages.INVALID_PLACEHOLDER_NAME;
      }
    }

    return { ...baseObject, ...overrides };
  }

  getLowercasePlaceholders(message) {
    const messageObj = this.parsedJSON[message];
    if (!Object.prototype.hasOwnProperty.call(messageObj, 'placeholders')) {
      return undefined;
    }
    if (
      !Object.prototype.hasOwnProperty.call(this.lowercasePlaceholders, message)
    ) {
      this.lowercasePlaceholders[message] = Object.keys(
        messageObj.placeholders
      ).map((placeholder) => placeholder.toLowerCase());
    }
    return this.lowercasePlaceholders[message];
  }

  hasPlaceholder(message, placeholder) {
    const messageObj = this.parsedJSON[message];
    return (
      Object.prototype.hasOwnProperty.call(messageObj, 'placeholders') &&
      this.getLowercasePlaceholders(message).includes(placeholder.toLowerCase())
    );
  }

  _validate() {
    this.isValid = validateLocaleMessages(this.parsedJSON);
    if (!this.isValid) {
      log.debug('Schema Validation messages', validateLocaleMessages.errors);

      validateLocaleMessages.errors.forEach((error) => {
        const message = this.errorLookup(error);
        this.collector.addError(message);
      });
    }

    const regexp = new RegExp(MESSAGE_PLACEHOLDER_REGEXP, 'ig');
    const visitedLowercaseMessages = [];

    Object.keys(this.parsedJSON).forEach((message) => {
      if (!visitedLowercaseMessages.includes(message.toLowerCase())) {
        visitedLowercaseMessages.push(message.toLowerCase());
      } else {
        this.collector.addError({
          ...messages.JSON_DUPLICATE_KEY,
          file: this.filename,
          description: `Case-insensitive duplicate message name: ${message} found in JSON`,
          instancePath: `/${message}`,
        });
        this.isValid = false;
      }

      if (message.startsWith('@@')) {
        this.collector.addWarning({
          file: this.filename,
          instancePath: `/${message}`,
          ...messages.PREDEFINED_MESSAGE_NAME,
        });
      }

      const messageContent = this.parsedJSON[message].message;
      let matches = regexp.exec(messageContent);
      while (matches !== null) {
        if (!this.hasPlaceholder(message, matches[1])) {
          this.collector.addWarning({
            file: this.filename,
            instancePath: `/${message}/placeholders/${matches[1]}`,
            ...messages.MISSING_PLACEHOLDER,
          });
        }
        matches = regexp.exec(messageContent);
      }

      if (
        Object.prototype.hasOwnProperty.call(
          this.parsedJSON[message],
          'placeholders'
        )
      ) {
        const visitedLowercasePlaceholders = [];
        Object.keys(this.parsedJSON[message].placeholders).forEach(
          (placeholder) => {
            if (
              !visitedLowercasePlaceholders.includes(placeholder.toLowerCase())
            ) {
              visitedLowercasePlaceholders.push(placeholder.toLowerCase());
            } else {
              this.collector.addError({
                ...messages.JSON_DUPLICATE_KEY,
                file: this.filename,
                description: `Case-insensitive duplicate placeholder name: ${placeholder} found in JSON`,
                instancePath: `/${message}/placeholders/${placeholder}`,
              });
              this.isValid = false;
            }
          }
        );
      }

      // Reset the regexp
      regexp.lastIndex = 0;
    });
  }
}
