import { default as Collector } from 'collector';

import { fakeMessageData } from './helpers';

describe('Collector', () => {
  it('should be thrown an error if Message is created without a type', () => {
    expect(() => {
      const collection = new Collector();
      collection._addMessage();
    }).toThrow(/Message type "undefined" is not/);
  });

  it('should be thrown an error if Message is created with bad type', () => {
    expect(() => {
      const collection = new Collector();
      collection._addMessage('whatevs');
    }).toThrow(/Message type "whatevs" is not/);
  });

  it('should be throw an error type is not collected', () => {
    expect(() => {
      const FakeMessage = sinon.stub();
      const collection = new Collector();
      collection._addMessage('whatevar', fakeMessageData, FakeMessage);
    }).toThrow(/Message type "whatevar" not currently collected/);
  });

  it('length should start at 0', () => {
    const collection = new Collector();
    expect(collection.length).toEqual(0);
  });

  it('length should reflect number of messages', () => {
    const collection = new Collector();
    expect(collection.length).toEqual(0);
    collection.addError(fakeMessageData);
    expect(collection.length).toEqual(1);
    collection.addNotice(fakeMessageData);
    expect(collection.length).toEqual(2);
    collection.addWarning(fakeMessageData);
    expect(collection.length).toEqual(3);
  });

  it('should create an error message', () => {
    const collection = new Collector();
    collection.addError(fakeMessageData);
    expect(collection.errors[0].type).toEqual('error');
    expect(collection.notices.length).toEqual(0);
    expect(collection.warnings.length).toEqual(0);
  });

  it('should create a notice message', () => {
    const collection = new Collector();
    collection.addNotice(fakeMessageData);
    expect(collection.notices[0].type).toEqual('notice');
    expect(collection.errors.length).toEqual(0);
    expect(collection.warnings.length).toEqual(0);
  });

  it('should create a warning message', () => {
    const collection = new Collector();
    collection.addWarning(fakeMessageData);
    expect(collection.warnings[0].type).toEqual('warning');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should not add a duplicate message with a instancePath', () => {
    const collection = new Collector();
    collection.addWarning({ ...fakeMessageData, instancePath: '/foo' });
    collection.addWarning({ ...fakeMessageData, instancePath: '/foo' });
    expect(collection.warnings.length).toEqual(1);
    expect(collection.warnings[0].type).toEqual('warning');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should not add duplicate files to scannedFiles', () => {
    const collection = new Collector();

    collection.recordScannedFile('foo.js', 'test');
    collection.recordScannedFile('foo.js', 'test');
    collection.recordScannedFile('foo.js', 'new-test');

    expect(collection.scannedFiles).toEqual({
      'foo.js': ['test', 'new-test'],
    });
  });

  it('for manifest should add one message for instancePath', () => {
    const collection = new Collector();
    collection.addError({
      ...fakeMessageData,
      file: 'manifest.json',
      instancePath: '/foo/1',
    });
    collection.addError({
      ...fakeMessageData,
      file: 'manifest.json',
      instancePath: '/foo/1',
      message: 'foo bar',
    });
    expect(collection.errors.length).toBe(1);
  });

  it('should add a message that differs on line number', () => {
    const collection = new Collector();
    collection.addWarning({
      ...fakeMessageData,
      instancePath: '/foo',
      file: 'foo.js',
      line: 25,
    });
    collection.addWarning({
      ...fakeMessageData,
      instancePath: '/foo',
      file: 'foo.js',
      line: 26,
    });
    expect(collection.warnings.length).toEqual(2);
    expect(collection.warnings[0].line).toEqual(25);
    expect(collection.warnings[1].line).toEqual(26);
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should add a message that differs on one prop', () => {
    const collection = new Collector();
    collection.addWarning({ ...fakeMessageData, instancePath: '/foo' });
    collection.addWarning({
      ...fakeMessageData,
      instancePath: '/foo',
      message: 'Foo message',
    });
    expect(collection.warnings.length).toEqual(2);
    expect(collection.warnings[1].message).toEqual('Foo message');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should throw when getting messages for an undefined instancePath', () => {
    const collection = new Collector();
    expect(() => {
      collection.messagesAtInstancePath(undefined);
    }).toThrow(/instancePath is required/);
  });
});
