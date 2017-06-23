import { default as Collector } from 'collector';
import { fakeMessageData } from './helpers';

describe('Collector', function() {

  it('should be thrown an error if Message is created without a type', () => {
    expect(() => {
      var collection = new Collector();
      collection._addMessage();
    }).toThrow(/Message type "undefined" is not/);
  });

  it('should be thrown an error if Message is created with bad type', () => {
    expect(() => {
      var collection = new Collector();
      collection._addMessage('whatevs');
    }).toThrow(/Message type "whatevs" is not/);
  });

  it('should be throw an error type is not collected', () => {
    expect(() => {
      var FakeMessage = sinon.stub();
      var collection = new Collector();
      collection._addMessage('whatevar', fakeMessageData, FakeMessage);
    }).toThrow(/Message type "whatevar" not currently collected/);
  });

  it('length should start at 0', () => {
    var collection = new Collector();
    expect(collection.length).toEqual(0);
  });

  it('length should reflect number of messages', () => {
    var collection = new Collector();
    expect(collection.length).toEqual(0);
    collection.addError(fakeMessageData);
    expect(collection.length).toEqual(1);
    collection.addNotice(fakeMessageData);
    expect(collection.length).toEqual(2);
    collection.addWarning(fakeMessageData);
    expect(collection.length).toEqual(3);
  });

  it('should create an error message', () => {
    var collection = new Collector();
    collection.addError(fakeMessageData);
    expect(collection.errors[0].type).toEqual('error');
    expect(collection.notices.length).toEqual(0);
    expect(collection.warnings.length).toEqual(0);
  });

  it('should create a notice message', () => {
    var collection = new Collector();
    collection.addNotice(fakeMessageData);
    expect(collection.notices[0].type).toEqual('notice');
    expect(collection.errors.length).toEqual(0);
    expect(collection.warnings.length).toEqual(0);
  });

  it('should create a warning message', () => {
    var collection = new Collector();
    collection.addWarning(fakeMessageData);
    expect(collection.warnings[0].type).toEqual('warning');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should not add a duplicate message with a dataPath', () => {
    var collection = new Collector();
    collection.addWarning({ ...fakeMessageData, dataPath: '/foo' });
    collection.addWarning({ ...fakeMessageData, dataPath: '/foo' });
    expect(collection.warnings.length).toEqual(1);
    expect(collection.warnings[0].type).toEqual('warning');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should not add duplicate files to scannedFiles', () => {
    var collection = new Collector();

    collection.recordScannedFile('foo.js', 'test');
    collection.recordScannedFile('foo.js', 'test');
    collection.recordScannedFile('foo.js', 'new-test');

    expect(collection.scannedFiles).toEqual({
      'foo.js': ['test', 'new-test'],
    });
  });

  it('should add a message that differs on line number', () => {
    var collection = new Collector();
    collection.addWarning({
      ...fakeMessageData,
      dataPath: '/foo',
      file: 'foo.js',
      line: 25,
    });
    collection.addWarning({
      ...fakeMessageData,
      dataPath: '/foo',
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
    var collection = new Collector();
    collection.addWarning({ ...fakeMessageData, dataPath: '/foo' });
    collection.addWarning({
      ...fakeMessageData,
      dataPath: '/foo',
      message: 'Foo message',
    });
    expect(collection.warnings.length).toEqual(2);
    expect(collection.warnings[1].message).toEqual('Foo message');
    expect(collection.errors.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
  });

  it('should filter message by filename if config.scanFile is defined', () => {
    var collection = new Collector({
      scanFile: ['test.js', 'no-match-file.js'],
    });

    expect(collection.length).toEqual(0);

    // Test linting error without a file.
    collection.addError({
      ...fakeMessageData,
    });
    expect(collection.length).toEqual(1);

    expect(collection.errors.length).toEqual(1);
    expect(collection.warnings.length).toEqual(0);
    expect(collection.notices.length).toEqual(0);
    expect(collection.errors[0].code).toEqual(fakeMessageData.code);

    // Test linting error with an excluded file.
    collection.addError({
      ...fakeMessageData,
      file: 'non-test.js',
    });
    expect(collection.length).toEqual(1);

    // Test linting error with an included file.
    collection.addError({
      ...fakeMessageData,
      file: 'test.js',
    });
    expect(collection.length).toEqual(2);

    // Test filtered warnings.
    collection.addWarning({
      ...fakeMessageData,
      file: 'test.js',
    });
    expect(collection.length).toEqual(3);

    // Test filtered notices.
    collection.addNotice({
      ...fakeMessageData,
      file: 'test.js',
    });
    expect(collection.length).toEqual(4);

    expect(collection.errors.length).toEqual(2);
    expect(collection.warnings.length).toEqual(1);
    expect(collection.notices.length).toEqual(1);

    expect(collection.errors[1].code).toEqual(fakeMessageData.code);
    expect(collection.errors[1].file).toEqual('test.js');
    expect(collection.warnings[0].code).toEqual(fakeMessageData.code);
    expect(collection.warnings[0].file).toEqual('test.js');
    expect(collection.notices[0].code).toEqual(fakeMessageData.code);
    expect(collection.notices[0].file).toEqual('test.js');
  });

  it('should throw when getting messages for an undefined dataPath', () => {
    var collection = new Collector();
    expect(() => {
      collection.messagesAtDataPath(undefined);
    }).toThrow(/dataPath is required/);
  });

});
