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
      '1.0.0.0b10',
      '1.0.0alpha01',
      '1.0.0beta2',
      '1.0a1',
      '1a',
      '1alpha',
      '1b',
      '1beta',
      '1pre',
      '1rc',
      '2.10.2',
      '3.1.2.4567',
      '3.1.2.65535',
      '4.1.1.2pre3',
      '4.1.1pre2',
      '4.1pre1',
    ];

    const invalidVersionStrings = [
      '.',
      '0.1.12dev-cb31c51',
      '01',
      '1.',
      '1.0.0+1',
      '1.0.0-beta2',
      '1.0.0-rc1.0+001',
      '1.0.0.0.0a',
      '1.0.0a-1',
      '1.0.0a1.1',
      '1.000000',
      '1.000000a1',
      '1.01',
      '1.01a',
      '1.2.2.2.4',
      '1.2.2.2.4a',
      '123e5',
      '1abc',
      '2.99999',
      '3.65536',
      '3.65536a1',
      '4.1.1dev-abcdef1',
      'a.b.c.d',
      2,
      `1.${'9'.repeat(100)}`,
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
