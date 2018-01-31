import Linter from 'linter';
import MessagesJSONParser from 'parsers/messagesjson';
import * as messages from 'messages';

import { validMessagesJSON } from '../helpers';

describe('MessagesJSONParser', () => {
  it('should be invalid if bad JSON', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser('blah',
      addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
  });

  it('should be invalid if placeholder has no content', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "blah": {
    "message": "$CONTENT$",
    "placeholders": {
      "CONTENT": {
        "example": "Content"
      }
    }
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.NO_PLACEHOLDER_CONTENT.code);
    expect(errors[0].message).toEqual(messages.NO_PLACEHOLDER_CONTENT.message);
  });

  it('should be invalid without message property for string', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "blah": {
    "mesage": "foo"
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.NO_MESSAGE.code);
    expect(errors[0].message).toEqual(messages.NO_MESSAGE.message);
  });

  it('should show a warning for reserved message names', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "@@extension_id": {
    "message": "foo"
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(1);
    expect(warnings[0].code).toEqual(messages.PREDEFINED_MESSAGE_NAME.code);
    expect(warnings[0].message).toEqual(messages.PREDEFINED_MESSAGE_NAME.message);
  });

  it('should show warnings for missing placeholders', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "blah": {
    "message": "foo $BAR$ $BAZ$",
    "placeholders": {
      "BAR": {
        "content": "bar"
      }
    }
  },
  "bleh": {
    "message": "$EMPTY$"
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(2);
    expect(warnings[0].code).toEqual(messages.MISSING_PLACEHOLDER.code);
    expect(warnings[0].message).toEqual(messages.MISSING_PLACEHOLDER.message);
    expect(warnings[1].code).toEqual(messages.MISSING_PLACEHOLDER.code);
    expect(warnings[1].message).toEqual(messages.MISSING_PLACEHOLDER.message);
  });

  it('should be invalid if bad message name', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "not-valid": {
    "message": "foo"
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.INVALID_MESSAGE_NAME.code);
    expect(errors[0].message).toEqual(messages.INVALID_MESSAGE_NAME.message);
  });

  it('should be invalid if bad placeholder name', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(`{
  "invalid_placeholder": {
    "message": "$PH-1$",
    "placeholders": {
      "PH-1": {
        "content": "placeholder 1"
      }
    }
  }
}`, addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.INVALID_PLACEHOLDER_NAME.code);
    expect(errors[0].message).toEqual(messages.INVALID_PLACEHOLDER_NAME.message);
  });

  it('should not have any issues with a valid messages JSON', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const messagesJSONParser = new MessagesJSONParser(validMessagesJSON(), addonsLinter.collector);
    messagesJSONParser.parse();
    expect(messagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(0);
  });
});
