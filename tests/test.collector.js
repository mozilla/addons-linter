import { default as Collector } from 'collector';
import { fakeMessageData } from './helpers';

describe('Collector', function() {

  it('should be thrown an error if Message is created without a type', () => {
    assert.throws(() => {
      var collection = new Collector();
      collection._addMessage();
    }, Error, /Message type "undefined" is not/);
  });

  it('should be thrown an error if Message is created with bad type', () => {
    assert.throws(() => {
      var collection = new Collector();
      collection._addMessage('whatevs');
    }, Error, /Message type "whatevs" is not/);
  });

  it('should be throw an error type is not collected', () => {
    assert.throws(() => {
      var FakeMessage = sinon.stub();
      var collection = new Collector();
      collection._addMessage('whatevar', fakeMessageData, FakeMessage);
    }, Error, /Message type "whatevar" not currently collected/);
  });

  it('length should start at 0', () => {
    var collection = new Collector();
    assert.equal(collection.length, 0);
  });

  it('length should reflect number of messages', () => {
    var collection = new Collector();
    assert.equal(collection.length, 0);
    collection.addError(fakeMessageData);
    assert.equal(collection.length, 1);
    collection.addNotice(fakeMessageData);
    assert.equal(collection.length, 2);
    collection.addWarning(fakeMessageData);
    assert.equal(collection.length, 3);
  });

  it('should create an error message', () => {
    var collection = new Collector();
    collection.addError(fakeMessageData);
    assert.equal(collection.errors[0].type, 'error');
    assert.equal(collection.notices.length, 0);
    assert.equal(collection.warnings.length, 0);
  });

  it('should create a notice message', () => {
    var collection = new Collector();
    collection.addNotice(fakeMessageData);
    assert.equal(collection.notices[0].type, 'notice');
    assert.equal(collection.errors.length, 0);
    assert.equal(collection.warnings.length, 0);
  });

  it('should create a warning message', () => {
    var collection = new Collector();
    collection.addWarning(fakeMessageData);
    assert.equal(collection.warnings[0].type, 'warning');
    assert.equal(collection.errors.length, 0);
    assert.equal(collection.notices.length, 0);
  });

  it('should not add a duplicate dataPath', () => {
    var collection = new Collector();
    collection.addWarning({ ...fakeMessageData, dataPath: '/foo' });
    collection.addWarning({ ...fakeMessageData, dataPath: '/foo' });
    assert.equal(collection.warnings.length, 1);
    assert.equal(collection.warnings[0].type, 'warning');
    assert.equal(collection.errors.length, 0);
    assert.equal(collection.notices.length, 0);
  });

  it('should overwrite an old message about additionalProperties', () => {
    var collection = new Collector();
    collection.addWarning({
      ...fakeMessageData,
      keyword: 'additionalProperties',
      dataPath: '/foo',
    });
    collection.addWarning({
      ...fakeMessageData,
      keyword: 'type',
      dataPath: '/foo',
    });
    assert.equal(collection.warnings.length, 1);
    assert.equal(collection.warnings[0].keyword, 'type');
    assert.equal(collection.errors.length, 0);
    assert.equal(collection.notices.length, 0);
  });

  it('should allow the same dataPath in different message types', () => {
    var collection = new Collector();
    collection.addWarning({
      ...fakeMessageData,
      dataPath: '/foo',
    });
    collection.addError({
      ...fakeMessageData,
      dataPath: '/foo',
    });
    assert.equal(collection.warnings.length, 1);
    assert.equal(collection.errors.length, 1);
    assert.equal(collection.notices.length, 0);
  });

  it('should handle multiple messages and uniqueness', () => {
    var messageOverrides = [
      { dataPath: '/foo' },
      { dataPath: '/foo/bar', keyword: 'format' },
      { dataPath: '/bar' },
      { dataPath: '/foo/bar', keyword: 'type' },
    ];
    var collection = new Collector();
    messageOverrides.forEach((overrides) => {
      collection.addWarning({ ...fakeMessageData, ...overrides });
    });
    assert.equal(collection.warnings.length, 3);
    assert.equal(collection.warnings[0].dataPath, '/foo');
    assert.equal(collection.warnings[1].dataPath, '/foo/bar');
    assert.equal(collection.warnings[1].keyword, 'format');
    assert.equal(collection.warnings[2].dataPath, '/bar');
    assert.equal(collection.errors.length, 0);
    assert.equal(collection.notices.length, 0);
  });

  it('should filter message by filename if config.scanFile is defined', () => {
    var collection = new Collector({
      scanFile: ['test.js', 'no-match-file.js'],
    });

    assert.equal(collection.length, 0);

    // Test linting error without a file.
    collection.addError({
      ...fakeMessageData,
    });
    assert.equal(collection.length, 1);

    assert.equal(collection.errors.length, 1);
    assert.equal(collection.warnings.length, 0);
    assert.equal(collection.notices.length, 0);
    assert.equal(collection.errors[0].code, fakeMessageData.code);

    // Test linting error with an excluded file.
    collection.addError({
      ...fakeMessageData,
      file: 'non-test.js',
    });
    assert.equal(collection.length, 1);

    // Test linting error with an included file.
    collection.addError({
      ...fakeMessageData,
      file: 'test.js',
    });
    assert.equal(collection.length, 2);

    // Test filtered warnings.
    collection.addWarning({
      ...fakeMessageData,
      file: 'test.js',
    });
    assert.equal(collection.length, 3);

    // Test filtered notices.
    collection.addNotice({
      ...fakeMessageData,
      file: 'test.js',
    });
    assert.equal(collection.length, 4);

    assert.equal(collection.errors.length, 2);
    assert.equal(collection.warnings.length, 1);
    assert.equal(collection.notices.length, 1);

    assert.equal(collection.errors[1].code, fakeMessageData.code);
    assert.equal(collection.errors[1].file, 'test.js');
    assert.equal(collection.warnings[0].code, fakeMessageData.code);
    assert.equal(collection.warnings[0].file, 'test.js');
    assert.equal(collection.notices[0].code, fakeMessageData.code);
    assert.equal(collection.notices[0].file, 'test.js');
  });

});
