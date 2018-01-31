import cloneDeep from 'lodash.clonedeep';

import { validateMessages } from 'schema/validator';

import { validMessagesJSON } from '../helpers';


describe('messages', () => {
  it('should be valid', () => {
    const messages = cloneDeep(JSON.parse(validMessagesJSON()));
    validateMessages(messages);
    expect(validateMessages.errors).toBeNull();
  });

  it('should fail on missing message property', () => {
    const messages = cloneDeep(JSON.parse(validMessagesJSON()));
    delete messages.foo.message;
    validateMessages(messages);
    expect(validateMessages.errors.length).toEqual(1);
    expect(validateMessages.errors[0].dataPath).toEqual('/foo/message');
  });

  it('should fail on invalid message name', () => {
    const messages = cloneDeep(JSON.parse(validMessagesJSON()));
    messages['invalid-property'] = {};
    validateMessages(messages);
    expect(validateMessages.errors.length).toEqual(1);
    expect(validateMessages.errors[0].dataPath).toEqual('/invalid-property');
  });

  it('should fail on missing placeholder content', () => {
    const messages = cloneDeep(JSON.parse(validMessagesJSON()));
    delete messages.Placeh0lder_Test.placeholders.foo.content;
    validateMessages(messages);
    expect(validateMessages.errors.length).toEqual(1);
    expect(validateMessages.errors[0].dataPath).toEqual('/Placeh0lder_Test/placeholders/foo/content');
  });

  it('should fail on invalid placeholder name', () => {
    const messages = cloneDeep(JSON.parse(validMessagesJSON()));
    messages.Placeh0lder_Test.placeholders['invalid.placeholder'] = {};
    validateMessages(messages);
    expect(validateMessages.errors.length).toEqual(1);
    expect(validateMessages.errors[0].dataPath).toEqual('/Placeh0lder_Test/placeholders/invalid.placeholder');
  });
});
