import Linter from 'linter';
import LocaleMessagesJSONParser from 'parsers/locale-messagesjson';
import * as messages from 'messages';

import { validLocaleMessagesJSON } from '../helpers';

describe('LocaleMessagesJSONParser', () => {
  it('should be invalid if bad JSON', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      'blah',
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
  });

  it('should be invalid if placeholder has no content', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "blah": {
    "message": "$CONTENT$",
    "placeholders": {
      "CONTENT": {
        "example": "Content"
      }
    }
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.NO_PLACEHOLDER_CONTENT.code);
    expect(errors[0].message).toEqual(messages.NO_PLACEHOLDER_CONTENT.message);
    expect(errors[0].instancePath).toEqual('/blah/placeholders/CONTENT');
  });

  it('should be invalid without message property for string', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "blah": {
    "mesage": "foo"
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.NO_MESSAGE.code);
    expect(errors[0].message).toEqual(messages.NO_MESSAGE.message);
    expect(errors[0].instancePath).toEqual('/blah');
  });

  it('should show a warning for reserved message names', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "@@extension_id": {
    "message": "foo"
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(1);
    expect(warnings[0].code).toEqual(messages.PREDEFINED_MESSAGE_NAME.code);
    expect(warnings[0].message).toEqual(
      messages.PREDEFINED_MESSAGE_NAME.message
    );
    expect(warnings[0].instancePath).toEqual('/@@extension_id');
  });

  it('should show warnings for missing placeholders', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
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
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(2);
    expect(warnings[0].code).toEqual(messages.MISSING_PLACEHOLDER.code);
    expect(warnings[0].message).toEqual(messages.MISSING_PLACEHOLDER.message);
    expect(warnings[0].instancePath).toEqual('/blah/placeholders/BAZ');
    expect(warnings[1].code).toEqual(messages.MISSING_PLACEHOLDER.code);
    expect(warnings[1].message).toEqual(messages.MISSING_PLACEHOLDER.message);
    expect(warnings[1].instancePath).toEqual('/bleh/placeholders/EMPTY');
  });

  it('should not be invalid on non alphanumeric message name', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "not-valid": {
    "message": "foo"
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(0);
  });

  it('should not be invalid on empty message', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "": {
    "message": "foo bar is the new bar foo"
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
  });

  it('should be invalid if bad placeholder name', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "invalid_placeholder": {
    "message": "$PH-1$",
    "placeholders": {
      "PH-1": {
        "content": "placeholder 1"
      }
    }
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.INVALID_PLACEHOLDER_NAME.code);
    expect(errors[0].message).toEqual(
      messages.INVALID_PLACEHOLDER_NAME.message
    );
    expect(errors[0].instancePath).toEqual('/invalid_placeholder/placeholders');
  });

  it('should not be case sensitive for placeholder names', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "perfectlyValidPlaceholderName": {
    "message": "$fooBarIsGreat$",
    "placeholders": {
      "fooBarIsGreat": {
        "content": "placeholder 1"
      }
    }
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
  });

  it('should not have any issues with a valid messages JSON', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      validLocaleMessagesJSON(),
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(0);
  });

  it('should find placeholders with different casing in definition', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "placeholder_case": {
    "message": "$fooBar$",
    "placeholders": {
      "foobar": {
        "content": "FOO BAR"
      }
    }
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(true);
    const { warnings } = addonsLinter.collector;
    expect(warnings.length).toEqual(0);
  });

  it('should be invalid with case-insensitive duplicate message names', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "duplicate": {
    "message": "foo"
  },
  "DUPLICATE": {
    "message": "bar"
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_DUPLICATE_KEY.code);
    expect(errors[0].description).toContain(
      'Case-insensitive duplicate message name'
    );
    expect(errors[0].instancePath).toEqual('/DUPLICATE');
  });

  it('should be invalid with case-insensitive duplicate placeholder names', () => {
    const addonsLinter = new Linter({ _: ['bar'] });
    const localeMessagesJSONParser = new LocaleMessagesJSONParser(
      `{
  "duplicate": {
    "message": "$foo$",
    "placeholders": {
      "FOO": {
        "content": "foo"
      },
      "foo": {
        "content": "FOO"
      }
    }
  }
}`,
      addonsLinter.collector
    );
    localeMessagesJSONParser.parse();
    expect(localeMessagesJSONParser.isValid).toEqual(false);
    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_DUPLICATE_KEY.code);
    expect(errors[0].description).toContain(
      'Case-insensitive duplicate placeholder name'
    );
    expect(errors[0].instancePath).toEqual('/duplicate/placeholders/foo');
  });

  describe('getLowercasePlaceholders', () => {
    it('should return undefined if there are no placeholders defined', () => {
      const addonsLinter = new Linter({ _: ['bar'] });
      const localeMessagesJSONParser = new LocaleMessagesJSONParser(
        `{
  "foo": {
    "message": "foo"
  }
}`,
        addonsLinter.collector
      );
      localeMessagesJSONParser.parse();
      const result = localeMessagesJSONParser.getLowercasePlaceholders('foo');
      expect(result).toEqual(undefined);
    });
  });
});
