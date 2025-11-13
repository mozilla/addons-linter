/* eslint-disable no-unused-vars */
import { default as Message, props } from 'message';

import { fakeMessageData } from './helpers';

describe('Message', () => {
  it('should throw on missing type', () => {
    expect(() => {
      const MyMessage = new Message();
    }).toThrow(/Message type "undefined" is not/);
  });

  it('should throw on invalid type', () => {
    expect(() => {
      const MyMessage = new Message('awooga');
    }).toThrow(/Message type "awooga" is not/);
  });

  it('should define all expected props', () => {
    const fakeData = {};
    props.forEach((prop) => {
      fakeData[prop] = prop;
    });
    const MyMessage = new Message('error', fakeData);
    props.forEach((prop) => {
      expect(MyMessage[prop]).toEqual(prop);
    });
  });

  it("shouldn't define random opts", () => {
    const MyMessage = new Message('error', {
      ...fakeMessageData,
      random: 'foo',
    });
    expect(MyMessage.random).not.toEqual('foo');
  });

  it('should throw on missing required prop', () => {
    expect(() => {
      const MyMessage = new Message('error', { description: 'foo' });
    }).toThrow(/Message data object is missing the following props/);
  });

  it('should throw on incorrect file prop filename', () => {
    expect(() => {
      const MyMessage = new Message('error', { filename: 'foo' });
    }).toThrow(/The key for the file is "file"/);
  });

  describe('matches', () => {
    let fakeData;

    beforeAll(() => {
      fakeData = props.reduce(
        (obj, prop) => ({
          ...obj,
          [prop]: prop,
        }),
        {}
      );
    });

    it('is a match if the props are all the same', () => {
      const message = new Message('error', { ...fakeData });
      const other = new Message('error', { ...fakeData });
      expect(message.matches(other)).toBeTruthy();
    });

    it('is not a match with props the same except type', () => {
      const message = new Message('error', { ...fakeData });
      const other = new Message('warning', { ...fakeData });
      expect(message.matches(other)).toBeFalsy();
    });

    it('is not a match with different props', () => {
      const message = new Message('error', { ...fakeData });
      const other = new Message('error', {
        ...fakeData,
        message: 'different message',
      });
      expect(message.matches(other)).toBeFalsy();
    });
  });
});
