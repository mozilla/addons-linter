import { default as Message, props } from 'message';
import { fakeMessageData } from './helpers';

/* eslint no-unused-vars:0*/

describe('Message', function() {

  it('should throw on missing type', () => {
    assert.throws(() => {
      var MyMessage = new Message();
    }, Error, /Message type "undefined" is not/);
  });

  it('should throw on invalid type', () => {
    assert.throws(() => {
      var MyMessage = new Message('awooga');
    }, Error, /Message type "awooga" is not/);
  });

  it('should define all expected props', () => {
    var fakeData = {};
    for (let prop of props) {
      fakeData[prop] = prop;
    }
    var MyMessage = new Message('error', fakeData);
    for (let prop of props) {
      assert.equal(MyMessage[prop], prop);
    }
  });

  it ("shouldn't define random opts", () => {
    var MyMessage = new Message('error',
      Object.assign({}, fakeMessageData, {random: 'foo'}));
    assert.notEqual(MyMessage.random, 'foo');
  });

  it('should throw on missing required prop', () => {
    assert.throws(() => {
      var MyMessage = new Message('error',
        Object.assign({}, {description: 'foo'}));
    }, Error, /Message data object is missing the following props/);
  });

  it('should throw on incorrect file prop filename', () => {
    assert.throws(() => {
      var MyMessage = new Message('error',
        Object.assign({}, {filename: 'foo'}));
    }, Error, /The key for the file is "file"/);
  });

  describe('matches', () => {
    let fakeData;

    before(() => {
      fakeData = props.reduce((obj, prop) => ({
        ...obj,
        [prop]: prop,
      }), {});
    });

    it('is a match if the props are all the same', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('error', { ...fakeData });
      assert.ok(message.matches(other));
    });

    it('is not a match with props the same except type', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('warning', { ...fakeData });
      assert.notOk(message.matches(other));
    });

    it('is not a match with different props', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('error', {
        ...fakeData,
        message: 'different message',
      });
      assert.notOk(message.matches(other));
    });
  });

});

