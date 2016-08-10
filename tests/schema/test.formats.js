import { isRelativeURL, isValidVersionString } from 'schema/formats';

describe('formats.isValidVersionString', () => {

  var validVersionStrings = [
    '0.1.12dev-cb31c51',
    '1.0',
    '1.0.0beta2',
    '2.10.2',
    '3.1.2.4567',
    '3.1.2.65535',
    '4.1pre1',
    '4.1.1pre2',
    '4.1.1dev-abcdef1',
    '4.1.1.2pre3',
  ];

  var invalidVersionStrings = [
    2,
    '123e5',
    '1.',
    '.',
    'a.b.c.d',
    '1.2.2.2.4',
    '01',
    '1.000000',
    '2.99999',
    '3.65536',
    '1.0.0-beta2',
  ];


  for (let validVersionString of validVersionStrings) {
    it(`should find ${validVersionString} to be valid`, () => {
      assert.ok(isValidVersionString(validVersionString));
    });
  }

  for (let invalidVersionString of invalidVersionStrings) {
    it(`should find ${invalidVersionString} to be invalid`, () => {
      assert.notOk(isValidVersionString(invalidVersionString));
    });
  }
});

describe('formats.isRelativeURL', () => {

  const notRelativeURLs = [
    'http://foo',
    'Https://foo.com/bar',
    'moz-extension://wat',
    '//foo',
  ];

  for (let notRelativeURL of notRelativeURLs) {
    it(`${notRelativeURL} should be invalid`, () => {
      assert.notOk(isRelativeURL(notRelativeURL));
    });
  }

  const relativeURLs = [
    'something.png',
    'js/jquery.js',
    '/js/jquery.js',
  ];

  for (let relativeURL of relativeURLs) {
    it(`${relativeURL} should be valid`, () => {
      assert.isOk(isRelativeURL(relativeURL));
    });
  }

});
