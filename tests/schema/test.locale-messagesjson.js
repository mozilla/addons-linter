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
    expect(validateLocaleMessages.errors[0].dataPath).toEqual('/foo/message');
  });

  it('should fail on invalid message name', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    messages['invalid-property'] = {};
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].dataPath).toEqual('/invalid-property');
  });

  it('should fail on missing placeholder content', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    delete messages.Placeh0lder_Test.placeholders.foo.content;
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].dataPath).toEqual('/Placeh0lder_Test/placeholders/foo/content');
  });

  it('should fail on invalid placeholder name', () => {
    const messages = cloneDeep(JSON.parse(validLocaleMessagesJSON()));
    messages.Placeh0lder_Test.placeholders['invalid.placeholder'] = {};
    validateLocaleMessages(messages);
    expect(validateLocaleMessages.errors.length).toEqual(1);
    expect(validateLocaleMessages.errors[0].dataPath).toEqual('/Placeh0lder_Test/placeholders/invalid.placeholder');
  });
});
