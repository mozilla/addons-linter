import { extname } from 'path';

import FilenameScanner from 'scanners/filename';
import * as constants from 'const';
import * as messages from 'messages';

describe('FilenameScanner', () => {
  it('should report a proper scanner name', () => {
    expect(FilenameScanner.scannerName).toEqual('filename');
  });

  it('should warn when finding a hidden file', async () => {
    const filenameScanner = new FilenameScanner('', '__MACOSX/foo.txt');

    const { linterMessages } = await filenameScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.HIDDEN_FILE.code);
    expect(linterMessages[0].file).toEqual('__MACOSX/foo.txt');
  });

  it('should warn when finding a flagged file', async () => {
    const filenameScanner = new FilenameScanner('', 'Thumbs.db');

    const { linterMessages } = await filenameScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.FLAGGED_FILE.code);
    expect(linterMessages[0].file).toEqual('Thumbs.db');
  });

  it('should warn when finding a flagged file extension', async () => {
    const filenameScanner = new FilenameScanner('', 'wat.exe');

    const { linterMessages } = await filenameScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(
      messages.FLAGGED_FILE_EXTENSION.code
    );
    expect(linterMessages[0].file).toEqual('wat.exe');
  });

  it('should warn when finding a signed extension', async () => {
    const filenameScanner = new FilenameScanner('', 'META-INF/manifest.mf');

    const { linterMessages } = await filenameScanner.scan();
    expect(linterMessages.length).toEqual(1);
    expect(linterMessages[0].code).toEqual(messages.ALREADY_SIGNED.code);
    expect(linterMessages[0].file).toEqual('META-INF/manifest.mf');
  });

  it('should error out when it fails the regexes', async () => {
    const filenameScanner = new FilenameScanner('', 'wat.txt');

    await expect(filenameScanner.scan()).rejects.toThrow(
      "Filename didn't match a regex: wat.txt."
    );
  });
});

describe('Hidden and Flagged File Regexes', () => {
  const matchingHiddenFiles = ['__MACOSX/foo.txt', '__MACOSX/.DS_Store'];

  matchingHiddenFiles.forEach((filePath) => {
    it(`should match ${filePath} as a hidden file`, () => {
      expect(filePath.match(constants.HIDDEN_FILE_REGEX)).toBeTruthy();
    });
  });

  const nonMatchingHiddenFiles = ['__MACOSXfoo.txt', 'foo/__MACOSX'];

  nonMatchingHiddenFiles.forEach((filePath) => {
    it(`should not match ${filePath} as a hidden file`, () => {
      expect(filePath.match(constants.HIDDEN_FILE_REGEX)).toBeFalsy();
    });
  });

  const matchingFlaggedFiles = [
    'foo/Thumbs.db',
    'foo/thumbs.db',
    'whatever/something.orig',
    'whatever/OLD.old',
    'whatever/.DS_STORE',
    'whatever/.DS_Store',
    'something~',
  ];

  matchingFlaggedFiles.forEach((filePath) => {
    it(`should match ${filePath} as a flagged file`, () => {
      expect(filePath.match(constants.FLAGGED_FILE_REGEX)).toBeTruthy();
    });
  });

  const nonMatchingFlaggedFiles = [
    'something/fooorig',
    'something/old',
    'foo/DS_Store',
    'Thumbs.db/foo',
    'whatever.orig/something',
    'whatever.old/something',
  ];

  nonMatchingFlaggedFiles.forEach((filePath) => {
    it(`should not match ${filePath} as a flagged file`, () => {
      expect(filePath.match(constants.FLAGGED_FILE_REGEX)).toBeFalsy();
    });
  });

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

  matchingFlaggedFileExtensions.forEach((filePath) => {
    it(`should match ${filePath} as a flagged file extensions`, () => {
      expect(
        constants.FLAGGED_FILE_EXTENSIONS.includes(extname(filePath))
      ).toBeTruthy();
    });
  });

  const nonMatchingFlaggedFileExtensions = ['wat.exe/something', 'wat_exe'];

  nonMatchingFlaggedFileExtensions.forEach((filePath) => {
    it(`should not match ${filePath} as a flagged file extension`, () => {
      expect(
        constants.FLAGGED_FILE_EXTENSIONS.includes(extname(filePath))
      ).toBeFalsy();
    });
  });

  const nonMatchingSignedFileExtensions = [
    'META_INF/manifest.mf',
    'META-INF/manifest_mf',
    'META-INF_manifest.mf',
  ];

  nonMatchingSignedFileExtensions.forEach((filePath) => {
    it(`should not match ${filePath} as a signed extension`, () => {
      expect(filePath.match(constants.ALREADY_SIGNED_REGEX)).toBeFalsy();
    });
  });
});

describe('Reserved file names', () => {
  const matchingReservedFiles = [
    'mozilla-recommendation.json',
    'foo/bar/.git/mozilla-recommendation.json',
  ];

  matchingReservedFiles.forEach((filePath) => {
    it(`should match ${filePath} as a reserved file`, async () => {
      const filenameScanner = new FilenameScanner('', filePath);

      const { linterMessages } = await filenameScanner.scan();
      expect(linterMessages.length).toEqual(1);
      expect(linterMessages[0].code).toEqual(messages.RESERVED_FILENAME.code);
      expect(linterMessages[0].message).toEqual('Reserved filename found.');
      expect(linterMessages[0].description).toMatch(
        /^Files whose names are reserved/
      );
      expect(linterMessages[0].file).toEqual(filePath);
    });
  });

  // Make sure we don't match by regular expressions of any kind. Only exact
  // matches count
  const nonMatchingReservedFiles = ['mozilla-recommendations.json'];

  nonMatchingReservedFiles.forEach((filePath) => {
    it(`should not match ${filePath} as a reserved file`, async () => {
      const filenameScanner = new FilenameScanner('', filePath);

      await expect(filenameScanner.scan()).rejects.toThrow(
        "Filename didn't match a regex: mozilla-recommendations.json."
      );
    });
  });
});
