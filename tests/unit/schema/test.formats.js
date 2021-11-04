import {
  imageDataOrStrictRelativeUrl,
  isAbsoluteUrl,
  isAnyUrl,
  isOrigin,
  isSecureUrl,
  isStrictRelativeUrl,
  isValidVersionString,
  manifestShortcutKey,
} from 'schema/formats';

describe('formats', () => {
  describe('isValidVersionString', () => {
    const validVersionStrings = [
      '1.0',
      '1.01a',
      '1.0.0beta2',
      '1.0.0beta-2',
      '1.000000a1',
      '2.10.2',
      '3.1.2.4567',
      '3.1.2.65535',
      '4.1pre1',
      '4.1.1pre2',
      '4.1.1.2pre3',
      '4.1.1.2pre-3',
      // The following two versions are equivalent in Firefox due to
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1733396
      // See also https://bugzilla.mozilla.org/show_bug.cgi?id=1732676
      '57.0.1buildid20210928100000',
      '57.0.1buildid0',
      // Regression test for https://github.com/mozilla/addons-linter/issues/3998
      '57.0.1buildid20210928.100000',
      '57.0.1buildid99999999.999999',
    ];

    const invalidVersionStrings = [
      2,
      '123e5',
      '1.',
      '.',
      'a.b.c.d',
      '1.2.2.2.4',
      '1.2.2.2.4a',
      '01',
      '1.01',
      '1.000000',
      '2.99999',
      '3.65536',
      '1.0.0-beta2',
      '1.0.0+1',
      '1.0.0-rc1.0+001',
      '0.1.12dev-cb31c51',
      '4.1.1dev-abcdef1',
      `1.${'9'.repeat(100)}`,
      '57.0.1buildid100000000.999999',
      '57.0.1buildid99999999.1000000',
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

  describe('manifestShortcutKey', () => {
    it('Accept supported formats', () => {
      // Only a small variation to see if it works as expected
      expect(manifestShortcutKey('Alt+Shift+U')).toEqual(true);
      expect(manifestShortcutKey('Ctrl+Shift+U')).toEqual(true);

      // Already taken shortcuts are allowed to be defined but won't work,
      // that's a problem for Firefox though, not for us
      expect(manifestShortcutKey('Ctrl+P')).toEqual(true);
    });

    it('Warn on invalid formats', () => {
      // Only a small variation to see if it works as expected
      expect(manifestShortcutKey('Win+F')).toEqual(false);

      // It's 'Period'
      expect(manifestShortcutKey('Periad')).toEqual(false);
    });

    it('Accepts accept media keys', () => {
      expect(manifestShortcutKey('MediaNextTrack')).toEqual(true);
      expect(manifestShortcutKey('MediaPlayPause')).toEqual(true);
      expect(manifestShortcutKey('MediaPrevTrack')).toEqual(true);
      expect(manifestShortcutKey('MediaStop')).toEqual(true);

      // But they can't be combined with other keys
      expect(manifestShortcutKey('MediaStop+F7')).toEqual(false);
    });

    it('Doesnt accept missing modifier', () => {
      expect(manifestShortcutKey('Home')).toEqual(false);

      // except for function keys
      expect(manifestShortcutKey('F8')).toEqual(true);
    });

    it('Doesnt accept duplicate key', () => {
      expect(manifestShortcutKey('Alt+Alt+F8')).toEqual(false);
      expect(manifestShortcutKey('Ctrl+Shift+Alt+F8')).toEqual(false);
    });

    it('Doesnt accept shift with non-function key', () => {
      expect(manifestShortcutKey('Shift+F8')).toEqual(true);
      expect(manifestShortcutKey('Shift+Home')).toEqual(false);
    });
  });

  describe('URL formats', () => {
    it('domain', () => {
      const value = 'https://example.com';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);
      expect(isOrigin(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
    });

    it('trailing slash', () => {
      const value = 'https://example.com/';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('full URL', () => {
      const value = 'https://example.com/something?like=true&this=that';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('domain with no path but with query string', () => {
      const value = 'https://example.com?like=true&this=that';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('domain with no path but with hash', () => {
      const value = 'https://example.com#fool';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('domain only but in mixed case', () => {
      const value = 'https://ExAmPle.coM';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);
      expect(isOrigin(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
    });

    it('invalid URLs', () => {
      const value = 'https://foo bar.com';

      expect(isAnyUrl(value)).toEqual(false);
      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('wildcard', () => {
      const value = 'https://*.bar.com';

      // FIXME: should these be true ?
      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('punycode', () => {
      const value = 'https://xn--fo-9ja.com';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);
      expect(isOrigin(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
    });

    it('IDN', () => {
      const value = 'https://foo.bar.栃木.jp';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isSecureUrl(value)).toEqual(true);
      expect(isOrigin(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
    });

    it('path only', () => {
      const value = '/some/path';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isStrictRelativeUrl(value)).toEqual(true);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(true);

      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('protocol relative', () => {
      const value = '//example.net/foo/bar';

      expect(isAnyUrl(value)).toEqual(true);

      expect(isAbsoluteUrl(value)).toEqual(false);
      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('ftp: scheme', () => {
      const value = 'ftp://example.org/favicon.ico';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('http: scheme', () => {
      const value = 'http://example.net/foo/bar';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false); // Because it contains path
    });

    it('http: scheme without path', () => {
      const value = 'http://example.net';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isOrigin(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
    });

    it('cannot be fooled with hand-crafted URLs', () => {
      // The isRelativeUrl function shouldn't have a magic string in it. If it
      // does, this function should use a URL with said magic string.
      const value = 'asdoiasjdpoaisjd://haha/this/is/absolute';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('image data PNG', () => {
      const value = 'data:image/png;base64,thisistotallybase64';

      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(isAnyUrl(value)).toEqual(true);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('image data JPG', () => {
      const value = 'data:image/jpeg;base64,thisistotallybase64';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });

    it('image data SVG', () => {
      // Only PNG and JPG are currently supported.
      const value = 'data:image/svg;base64,thisistotallybase64';

      expect(isAnyUrl(value)).toEqual(true);
      expect(isAbsoluteUrl(value)).toEqual(true);

      expect(isStrictRelativeUrl(value)).toEqual(false);
      expect(isSecureUrl(value)).toEqual(false);
      expect(imageDataOrStrictRelativeUrl(value)).toEqual(false);
      expect(isOrigin(value)).toEqual(false);
    });
  });
});
