import { extname } from 'path';

import FilenameScanner from 'scanners/filename';
import * as constants from 'const';
import * as messages from 'messages';

describe('FilenameScanner', function() {

  it('should report a proper scanner name', () => {
    expect(FilenameScanner.scannerName).toEqual('filename');
  });

  it('should warn when finding a hidden file', () => {
    var filenameScanner = new FilenameScanner('', '__MACOSX/foo.txt');

    return filenameScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.HIDDEN_FILE.code);
        expect(linterMessages[0].file).toEqual('__MACOSX/foo.txt');
      });
  });

  it('should warn when finding a flagged file', () => {
    var filenameScanner = new FilenameScanner('', 'Thumbs.db');

    return filenameScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.FLAGGED_FILE.code);
        expect(linterMessages[0].file).toEqual('Thumbs.db');
      });
  });

  it('should warn when finding a flagged file extension', () => {
    var filenameScanner = new FilenameScanner('', 'wat.exe');

    return filenameScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(
          messages.FLAGGED_FILE_EXTENSION.code
        );
        expect(linterMessages[0].file).toEqual('wat.exe');
      });
  });

  it('should warn when finding a signed extension', () => {
    var filenameScanner = new FilenameScanner('', 'META-INF/manifest.mf');

    return filenameScanner.scan()
      .then(({linterMessages}) => {
        expect(linterMessages.length).toEqual(1);
        expect(linterMessages[0].code).toEqual(messages.ALREADY_SIGNED.code);
        expect(linterMessages[0].file).toEqual('META-INF/manifest.mf');
      });
  });

  it('should error out when it fails the regexes', () => {
    var filenameScanner = new FilenameScanner('', 'wat.txt');

    return filenameScanner.scan()
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain('wat.txt');
      });
  });

});

describe('Hidden and Flagged File Regexes', function() {

  const matchingHiddenFiles = [
    '__MACOSX/foo.txt',
    '__MACOSX/.DS_Store',
  ];

  for (const filePath of matchingHiddenFiles) {
    it(`should match ${filePath} as a hidden file`, () => {
      expect(filePath.match(constants.HIDDEN_FILE_REGEX)).toBeTruthy();
    });
  }

  const nonMatchingHiddenFiles = [
    '__MACOSXfoo.txt',
    'foo/__MACOSX',
  ];

  for (const filePath of nonMatchingHiddenFiles) {
    it(`should not match ${filePath} as a hidden file`, () => {
      expect(filePath.match(constants.HIDDEN_FILE_REGEX)).toBeFalsy();
    });
  }

  const matchingFlaggedFiles = [
    'foo/Thumbs.db',
    'foo/thumbs.db',
    'whatever/something.orig',
    'whatever/OLD.old',
    'whatever/.DS_STORE',
    'whatever/.DS_Store',
    'something~',
  ];

  for (const filePath of matchingFlaggedFiles) {
    it(`should match ${filePath} as a flagged file`, () => {
      expect(filePath.match(constants.FLAGGED_FILE_REGEX)).toBeTruthy();
    });
  }

  const nonMatchingFlaggedFiles = [
    'something/fooorig',
    'something/old',
    'foo/DS_Store',
    'Thumbs.db/foo',
    'whatever.orig/something',
    'whatever.old/something',
  ];

  for (const filePath of nonMatchingFlaggedFiles) {
    it(`should not match ${filePath} as a flagged file`, () => {
      expect(filePath.match(constants.FLAGGED_FILE_REGEX)).toBeFalsy();
    });
  }

  const matchingFlaggedFileExtensions = [
    'something.exe',
    'foo/something.else.dll',
    'something.dylib',
    'something.so',
    'something.sh',
    'something.class',
    'something.swf',
    'something.jar',
  ];

  for (const filePath of matchingFlaggedFileExtensions) {
    it(`should match ${filePath} as a flagged file extensions`, () => {
      expect(
        constants.FLAGGED_FILE_EXTENSIONS.includes(extname(filePath))
      ).toBeTruthy();
    });
  }

  const nonMatchingFlaggedFileExtensions = [
    'wat.exe/something',
    'wat_exe',
  ];

  for (const filePath of nonMatchingFlaggedFileExtensions) {
    it(`should not match ${filePath} as a flagged file extension`, () => {
      expect(
        constants.FLAGGED_FILE_EXTENSIONS.includes(extname(filePath))
      ).toBeFalsy();
    });
  }

  const nonMatchingSignedFileExtensions = [
    'META_INF/manifest.mf',
    'META-INF/manifest_mf',
    'META-INF_manifest.mf',
  ];

  for (const filePath of nonMatchingSignedFileExtensions) {
    it(`should not match ${filePath} as a signed extension`, () => {
      expect(filePath.match(constants.ALREADY_SIGNED_REGEX)).toBeFalsy();
    });
  }
});
