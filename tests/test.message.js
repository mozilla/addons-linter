import { default as Message, props } from 'message';
import { fakeMessageData } from './helpers';

/* eslint no-unused-vars:0*/

describe('Message', function() {

  it('should throw on missing type', () => {
    expect(() => {
      var MyMessage = new Message();
    }).toThrow(/Message type "undefined" is not/);
  });

  it('should throw on invalid type', () => {
    expect(() => {
      var MyMessage = new Message('awooga');
    }).toThrow(/Message type "awooga" is not/);
  });

  it('should define all expected props', () => {
    var fakeData = {};
    for (let prop of props) {
      fakeData[prop] = prop;
    }
    var MyMessage = new Message('error', fakeData);
    for (let prop of props) {
      expect(MyMessage[prop]).toEqual(prop);
    }
  });

  it ("shouldn't define random opts", () => {
    var MyMessage = new Message('error',
      Object.assign({}, fakeMessageData, {random: 'foo'}));
    expect(MyMessage.random).not.toEqual('foo');
  });

  it('should throw on missing required prop', () => {
    expect(() => {
      var MyMessage = new Message('error',
        Object.assign({}, {description: 'foo'}));
    }).toThrow(/Message data object is missing the following props/);
  });

  it('should throw on incorrect file prop filename', () => {
    expect(() => {
      var MyMessage = new Message('error',
        Object.assign({}, {filename: 'foo'}));
    }).toThrow(/The key for the file is "file"/);
  });

  describe('matches', () => {
    let fakeData;

    beforeAll(() => {
      fakeData = props.reduce((obj, prop) => ({
        ...obj,
        [prop]: prop,
      }), {});
    });

    it('is a match if the props are all the same', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('error', { ...fakeData });
      expect(message.matches(other)).toBeTruthy();
    });

    it('is not a match with props the same except type', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('warning', { ...fakeData });
      expect(message.matches(other)).toBeFalsy();
    });

    it('is not a match with different props', () => {
      var message = new Message('error', { ...fakeData });
      var other = new Message('error', {
        ...fakeData,
        message: 'different message',
      });
      expect(message.matches(other)).toBeFalsy();
    });
  });

});

