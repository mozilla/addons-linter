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

});
