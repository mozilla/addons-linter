import cloneDeep from 'lodash.clonedeep';

import { validateLocaleMessages } from 'schema/validator';

import { validLocaleMessagesJSON } from '../helpers';

describe('messages', () => {
  it('should be valid', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors).toBeNull();
  });

  it('should fail on missing message property', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    delete messages.foo.message;
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].instancePath).toEqual('/foo');
  });

  it('should not validate the message name', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    messages[''] = { message: 'foo' };
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors).toBeNull();
  });

  it('should fail on missing placeholder content', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    delete messages.Placeh0lder_Test.placeholders.foo.content;
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].instancePath).toEqual(
      '/Placeh0lder_Test/placeholders/foo'
    );
  });

  it('should fail on invalid placeholder name', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    messages.Placeh0lder_Test.placeholders['invalid.placeholder'] = {};
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].instancePath).toEqual(
      '/Placeh0lder_Test/placeholders'
    );
  });
});
