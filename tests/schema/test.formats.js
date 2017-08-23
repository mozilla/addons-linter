import {
  isAbsoluteUrl,
  isAnyUrl,
  isSecureUrl,
  isStrictRelativeUrl,
  isValidVersionString,
} from 'schema/formats';

describe('formats', () => {
  describe('isValidVersionString', () => {
    const validVersionStrings = [
      '1.0',
      '1.0.0beta2',
      '2.10.2',
      '3.1.2.4567',
      '3.1.2.65535',
      '4.1pre1',
      '4.1.1pre2',
      '4.1.1.2pre3',
      '1.0a',
      '1.0alpha',
      '1.0b',
      '1.0beta',
      '1.0pre',
      '1.0rc',
      '1.0.0-beta2',
      '1.0.999999',
      '1.0.0-0',
      '1.0.0-a.1',
      '1.0.0-0.1',
      '1.0.0-0.a.0',
      '1.0.0-a+001',
      '1.0.0-beta+exp.sha.5114f85',
      '1.0.0+20130313144700',
    ];

    const invalidVersionStrings = [
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
      '0.1.12dev-cb31c51',
      '4.1.1dev-abcdef1',
      '1.0c',
    ];

    validVersionStrings.forEach((validVersionString) => {
      it(`should find ${validVersionString} to be valid`, () => {
        expect(isValidVersionString(validVersionString)).toEqual(true);
      });
    });

    invalidVersionStrings.forEach((invalidVersionString) => {
      it(`should find ${invalidVersionString} to be invalid`, () => {
        expect(isValidVersionString(invalidVersionString)).toEqual(false);
      });
    });
  });

  describe('URL formats', () => {
    it('domain', () => {
      const value = 'https://example.com';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
    });

    it('full URL', () => {
      const value = 'https://example.com/something?like=true&this=that';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
    });

    it('invalid URLs', () => {
      const value = 'https://foo bar.com';

      expect(isAnyUrl(value)).toEqual(false);
      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(isStrictRelativeUrl(value)).toEqual(false);
    });

    it('path only', () => {
      const value = '/some/path';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isStrictRelativeUrl(value)).toEqual(true);

      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
    });

    it('protocol relative', () => {
      const value = '//example.net/foo/bar';

      expect(isAnyUrl(value)).toEqual(true);

      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
    });

    it('ftp: scheme', () => {
      const value = 'ftp://example.org/favicon.ico';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
    });

    it('http: scheme', () => {
      const value = 'http://example.net/foo/bar';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
    });

    it('cannot be fooled with hand-crafted URLs', () => {
      // The isRelativeUrl function shouldn't have a magic string in it. If it
      // does, this function should use a URL with said magic string.
      const value = 'asdoiasjdpoaisjd://haha/this/is/absolute';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
    });
  });
});
