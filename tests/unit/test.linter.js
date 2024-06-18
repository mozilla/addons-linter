/* eslint-disable max-classes-per-file */
import fs from 'fs';

import { oneLine } from 'common-tags';
import { Xpi } from 'addons-scanner-utils/dist/io';
import {
  DuplicateZipEntryError,
  InvalidZipFileError,
} from 'addons-scanner-utils/dist/errors';
import { createFakeStderr } from 'addons-scanner-utils/dist/test-helpers';

import Linter from 'linter';
import * as constants from 'const';
import * as messages from 'messages';
import ManifestJSONParser from 'parsers/manifestjson';
import BinaryScanner from 'scanners/binary';
import FilenameScanner from 'scanners/filename';
import JavaScriptScanner from 'scanners/javascript';
import JSONScanner from 'scanners/json';
import LangpackScanner from 'scanners/langpack';
import { AddonsLinterUserError } from 'utils';

import {
  fakeMessageData,
  validManifestJSON,
  validStaticThemeManifestJSON,
  assertHasMatchingError,
} from './helpers';

const fakeCheckFileExists = async () => {
  return {
    isDirectory: () => {
      return true;
    },
    isFile: () => {
      return true;
    },
  };
};

class FakeIOBase {
  async getFile() {
    return '';
  }

  async getFiles() {
    return {};
  }

  async getFilesByExt() {
    return [];
  }

  setScanFileCallback() {}
}

describe('Linter', () => {
  describe('validateConfig', () => {
    it('should throw on invalid manifest version range options', async () => {
      const addonLinter = new Linter({
        _: ['foo'],
        minManifestVersion: 3,
        maxManifestVersion: 2,
      });

      sinon.spy(addonLinter, 'validateConfig');

      await expect(addonLinter.run()).rejects.toThrow(AddonsLinterUserError);
      sinon.assert.calledOnce(addonLinter.validateConfig);

      await expect(addonLinter.run()).rejects.toThrow(
        /Invalid manifest version range requested/
      );
      sinon.assert.calledTwice(addonLinter.validateConfig);
    });
  });

  it('should detect an invalid file with ENOENT', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.handleError = sinon.stub();
    const fakeError = new Error('soz');
    fakeError.code = 'ENOENT';
    const fakeLstat = async () => {
      throw fakeError;
    };
    await expect(
      addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
    ).rejects.toThrow('Path "foo" is not a file');
  });

  it('should detect other errors during lstat', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.handleError = sinon.stub();
    const fakeError = new TypeError('soz');
    const fakeLstat = async () => {
      throw fakeError;
    };
    await expect(
      addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
    ).rejects.toThrow(fakeError);
  });

  it('should reject if not a file', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.handleError = sinon.stub();
    const isFileSpy = sinon.spy(() => {
      return false;
    });
    const isDirSpy = sinon.spy(() => {
      return false;
    });

    const fakeLstat = async () => {
      return {
        isFile: isFileSpy,
        isDirectory: isDirSpy,
      };
    };
    const expectedError = new Error(
      'Path "bar" is not a file or directory or does not exist.'
    );
    await expect(
      addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
    ).rejects.toThrow(expectedError);
    sinon.assert.calledOnce(isFileSpy);
  });

  it('should provide output via output prop', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError(fakeMessageData);
    const { output } = addonLinter;
    expect(output.count).toEqual(1);
    expect(output.summary.errors).toEqual(1);
    expect(output.summary.notices).toEqual(0);
    expect(output.summary.warnings).toEqual(0);
  });

  it('should collect an error when not an xpi/zip', async () => {
    const addonLinter = new Linter({ _: ['tests/fixtures/not-a-zip.zip'] });
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();
    expect(addonLinter.collector.errors.length).toEqual(0);
    await addonLinter.scan();
    expect(addonLinter.collector.errors.length).toEqual(1);
    expect(addonLinter.collector.errors[0].code).toEqual(
      messages.BAD_ZIPFILE.code
    );
  });

  // Uses an extension with a mozIndexedDB warning in it.
  it('should send JSScanner messages to the collector', async () => {
    const addonLinter = new Linter({ _: ['tests/fixtures/webext_mozdb.zip'] });
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    expect(addonLinter.collector.warnings.length).toEqual(0);

    await addonLinter.scan();
    expect(addonLinter.collector.warnings.length).toBeGreaterThan(0);
  });

  // Test to make sure we can all files inside an add-on, not just one of each.
  //
  // Uses our example xpi, with the following file layout:
  //
  // - chrome.manifest
  // - chrome/
  // - components/
  //   - main.js (has a mozIndexedDB assignment)
  //   - secondary.js (nothing bad)
  // - prefs.html
  it('should scan all files', async () => {
    const addonLinter = new Linter({ _: ['tests/fixtures/old.xpi'] });
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    const getFileSpy = sinon.spy(addonLinter, 'scanFile');

    await addonLinter.scan();
    sinon.assert.callOrder(
      getFileSpy.withArgs('components/main.js'),
      getFileSpy.withArgs('components/secondary.js'),
      getFileSpy.withArgs('prefs.html')
    );
  });

  it.each(['mjs', 'jsm'])('should scan %s files', async (fileExtension) => {
    const filename = `file.${fileExtension}`;
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension_scan_file'],
    });
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    const getFileSpy = sinon.spy(addonLinter, 'scanFile');

    await addonLinter.scan();
    sinon.assert.callOrder(
      getFileSpy.withArgs(filename),
      getFileSpy.withArgs('manifest.json')
    );
  });

  it('Eslint ignore patterns and .eslintignorerc should be ignored', async () => {
    // Verify https://github.com/mozilla/addons-linter/issues/1288 is fixed
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension_node_modules_bower'],
    });

    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    await addonLinter.scan();
    expect(addonLinter.collector.scannedFiles).toEqual({
      'index.js': ['javascript'],
      'bower_components/bar.js': ['javascript'],
      'node_modules/foo.js': ['javascript'],
      'manifest.json': ['json'],
    });
  });

  it('Eslint shouldnt ignore dotfiles', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension_hidden_files/'],
    });
    addonLinter.print = sinon.stub();

    await addonLinter.scan();
    expect(addonLinter.collector.scannedFiles).toEqual({
      '.hidden.js': ['javascript'],
    });
  });

  it('should throw when message.type is undefined', async () => {
    const addonLinter = new Linter({ _: ['tests/fixtures/webextension.zip'] });
    addonLinter.io = { files: { whatever: {} } };
    addonLinter.io.getFile = () => Promise.resolve();
    addonLinter.getScanner = sinon.stub();
    class FakeScanner {
      async scan() {
        return {
          linterMessages: [{ message: 'whatever' }],
          scannedFiles: [],
        };
      }
    }
    addonLinter.getScanner.returns(FakeScanner);
    await expect(addonLinter.scanFile('whatever')).rejects.toThrow(
      'message.type must be defined'
    );
  });

  it('should see an error if scanFiles() blows up', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    // Stub handleError to prevent output.
    addonLinter.handleError = sinon.stub();
    addonLinter.scanFiles = async () => {
      throw new Error('scanFiles explosion');
    };

    class FakeXpi extends FakeIOBase {
      async getFilesByExt() {
        return ['foo.js', 'bar.js'];
      }
    }

    await expect(addonLinter.scan({ _Xpi: FakeXpi })).rejects.toThrow(
      'scanFiles explosion'
    );
  });

  it('should call addError when Xpi rejects with dupe entry', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.collector.addError = sinon.stub();
    addonLinter.print = sinon.stub();
    const expectedError = new DuplicateZipEntryError('the zip has dupes!');
    class FakeXpi extends FakeIOBase {
      async getFiles() {
        throw expectedError;
      }

      getFilesByExt() {
        return this.getMetadata();
      }
    }
    await addonLinter.scan({ _Xpi: FakeXpi });
    sinon.assert.calledWith(
      addonLinter.collector.addError,
      messages.DUPLICATE_XPI_ENTRY
    );
    sinon.assert.calledOnce(addonLinter.print);
  });

  it('should call addError when Xpi rejects with InvalidZipFileError', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.collector.addError = sinon.stub();
    addonLinter.print = sinon.stub();
    const expectedError = new InvalidZipFileError(
      'invalid characters in fileName: fake\\file.txt'
    );
    class FakeXpi extends FakeIOBase {
      async getFiles() {
        throw expectedError;
      }

      getFilesByExt() {
        return this.getMetadata();
      }
    }
    await addonLinter.scan({ _Xpi: FakeXpi });
    sinon.assert.calledWith(addonLinter.collector.addError, {
      ...messages.INVALID_XPI_ENTRY,
      message: expectedError.message,
    });
    sinon.assert.calledOnce(addonLinter.print);
  });

  it('should throw if invalid type is passed to colorize', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    expect(() => {
      addonLinter.colorize('whatever');
    }).toThrow(/colorize passed invalid type/);
  });
});

describe('Linter.getScanner()', () => {
  it('should return BinaryScanner', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const Scanner = addonLinter.getScanner('foo.whatever');
    expect(Scanner).toEqual(BinaryScanner);
  });

  it.each(['foo.js', 'bar.jsm', 'baz.mjs'])(
    'should return JavaScriptScanner for file: %s',
    (file) => {
      const addonLinter = new Linter({ _: ['foo'] });
      const Scanner = addonLinter.getScanner(file);
      expect(Scanner).toEqual(JavaScriptScanner);
    }
  );

  it('should return JSONScanner', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const Scanner = addonLinter.getScanner('locales/en.json');
    expect(Scanner).toEqual(JSONScanner);
  });

  it('should return LangpackScanner', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    let Scanner = addonLinter.getScanner('foo.properties');
    expect(Scanner).toEqual(LangpackScanner);

    Scanner = addonLinter.getScanner('foo.ftl');
    expect(Scanner).toEqual(LangpackScanner);

    Scanner = addonLinter.getScanner('foo.dtd');
    expect(Scanner).toEqual(LangpackScanner);
  });

  const shouldBeFilenameScanned = [
    '__MACOSX/foo.txt',
    'wat.dll',
    'META-INF/manifest.mf',
    'mozilla-recommendation.json',
    'some/subfolder/mozilla-recommendation.json',
  ];

  shouldBeFilenameScanned.forEach((filename) => {
    it(`should return FilenameScanner for ${filename}`, () => {
      const addonLinter = new Linter({ _: ['foo'] });
      const Scanner = addonLinter.getScanner(filename);
      expect(Scanner).toEqual(FilenameScanner);
    });
  });
});

describe('Linter.handleError()', () => {
  it('should show stack if config.stack is true', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.config.stack = true;
    const fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    const fakeConsole = {
      error: sinon.stub(),
    };
    addonLinter.handleError(fakeError, fakeConsole);
    sinon.assert.calledWith(fakeConsole.error, fakeError.stack);
  });

  it('should show colorized error', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.chalk = {};
    addonLinter.chalk.red = sinon.stub();
    const fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    const fakeConsole = {
      error: sinon.stub(),
    };
    addonLinter.handleError(fakeError, fakeConsole);
    sinon.assert.calledOnce(fakeConsole.error);
    sinon.assert.calledWith(addonLinter.chalk.red, 'Errol the error');
  });
});

describe('Linter.print()', () => {
  it('should print as json when config.output is json', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.config.output = 'json';
    addonLinter.toJSON = sinon.stub();
    const fakeConsole = {
      log: sinon.stub(),
    };
    addonLinter.print(fakeConsole);
    sinon.assert.calledOnce(addonLinter.toJSON);
    sinon.assert.calledOnce(fakeConsole.log);
  });

  it('should print as json when config.output is text', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.textOutput = sinon.stub();
    addonLinter.config.output = 'text';
    const fakeConsole = {
      log: sinon.stub(),
    };
    addonLinter.print(fakeConsole);
    sinon.assert.calledOnce(addonLinter.textOutput);
    sinon.assert.calledOnce(fakeConsole.log);
  });

  it('should not print anything if config.output is none', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.textOutput = sinon.stub();
    addonLinter.toJSON = sinon.stub();
    addonLinter.config.output = 'none';
    const fakeConsole = {
      log: sinon.stub(),
    };
    addonLinter.print(fakeConsole);
    sinon.assert.notCalled(addonLinter.textOutput);
    sinon.assert.notCalled(addonLinter.toJSON);
    sinon.assert.notCalled(fakeConsole.log);
  });
});

describe('Linter.toJSON()', () => {
  it('should pass correct args to JSON.stringify for pretty printing', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({ pretty: true, _JSON: fakeJSON });
    sinon.assert.calledWith(fakeJSON.stringify, sinon.match.any, null, 4);
  });

  it('should output metadata when config.output is json', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.config.output = 'json';
    addonLinter.addonMetadata = {
      meta: 'data',
    };
    const fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({ pretty: true, _JSON: fakeJSON });
    expect(fakeJSON.stringify.firstCall.args[0].metadata.meta).toEqual('data');
  });

  it('should pass correct args to JSON.stringify for normal printing', () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({ pretty: false, _JSON: fakeJSON });
    sinon.assert.calledWith(fakeJSON.stringify, sinon.match.any);
  });

  it('should provide JSON via toJSON()', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError(fakeMessageData);
    const json = addonLinter.toJSON();
    const parsedJSON = JSON.parse(json);
    expect(parsedJSON.count).toEqual(1);
    expect(parsedJSON.summary.errors).toEqual(1);
    expect(parsedJSON.summary.notices).toEqual(0);
    expect(parsedJSON.summary.warnings).toEqual(0);
  });
});

describe('Linter.textOutput()', () => {
  // Return a large number from terminalWidth() so text doesn't wrap,
  // forcing the strings we check for to be far apart.
  function terminalWidth() {
    return 1000;
  }

  function mediumTerminalWidth() {
    return 77;
  }

  function smallTerminalWidth() {
    return 59;
  }

  function uselesslyTinyTerminalWidth() {
    return 1;
  }

  it('should have error in textOutput()', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    const text = addonLinter.textOutput(terminalWidth);
    expect(addonLinter.output.summary.errors).toEqual(1);
    expect(text).toContain('Validation Summary:');
    expect(text).toContain('WHATEVER_ERROR');
    expect(text).toContain('whatever error message');
    expect(text).toContain('whatever error description');
  });

  it('should have notice message in textOutput()', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addNotice({
      code: 'WHATEVER_NOTICE',
      message: 'whatever notice message',
      description: 'whatever notice description',
    });
    const text = addonLinter.textOutput(terminalWidth);
    expect(addonLinter.output.summary.notices).toEqual(1);
    expect(text).toContain('Validation Summary:');
    expect(text).toContain('WHATEVER_NOTICE');
    expect(text).toContain('whatever notice message');
    expect(text).toContain('whatever notice description');
  });

  it('should have warning in textOutput()', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addWarning({
      code: 'WHATEVER_WARNING',
      message: 'whatever warning message',
      description: 'whatever warning description',
    });
    const text = addonLinter.textOutput(terminalWidth);
    expect(addonLinter.output.summary.warnings).toEqual(1);
    expect(text).toContain('Validation Summary:');
    expect(text).toContain('WHATEVER_WARNING');
    expect(text).toContain('whatever warning message');
    expect(text).toContain('whatever warning description');
  });

  it('should remove description when terminal is <78 columns wide', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    const text = addonLinter.textOutput(mediumTerminalWidth);
    expect(addonLinter.output.summary.errors).toEqual(1);
    expect(text).not.toContain('Description');
    expect(text).not.toContain('whatever error description');
  });

  it('should remove columns, description, and lines when terminal is < 60 columns wide', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });
    const text = addonLinter.textOutput(smallTerminalWidth);
    expect(addonLinter.output.summary.errors).toEqual(1);
    expect(text).not.toContain('Description');
    expect(text).not.toContain('whatever error description');
    expect(text).not.toContain('Column');
    expect(text).not.toContain('5');
    expect(text).not.toContain('Line');
    expect(text).not.toContain('20');
  });

  it('should survive even a 1 column terminal', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });

    try {
      addonLinter.textOutput(uselesslyTinyTerminalWidth);
      expect(addonLinter.output.summary.errors).toEqual(1);
    } catch (e) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(false).toBe(true);
    }
  });
});

describe('Linter.getAddonMetadata()', () => {
  it('should init with null metadata', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension.zip'],
    });

    addonLinter.print = sinon.stub();

    expect(addonLinter.addonMetadata).toBe(null);

    await addonLinter.scan();
    const metadata = await addonLinter.getAddonMetadata();
    expect(Object.keys(metadata).length).toBeGreaterThan(0);
  });

  it('should cache and return cached addonMetadata', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension.zip'],
    });

    addonLinter.io = new Xpi({
      filePath: addonLinter.packagePath,
      stderr: createFakeStderr(),
    });
    addonLinter.print = sinon.stub();

    // This should only be called when the addonMetadata _is_ populated.
    const fakeLog = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };

    function getMetadata() {
      return addonLinter.getAddonMetadata({ _log: fakeLog });
    }

    await getMetadata();
    sinon.assert.notCalled(fakeLog.debug);
    expect(typeof addonLinter.addonMetadata).toBe('object');
    await getMetadata();
    sinon.assert.calledOnce(fakeLog.debug);
    sinon.assert.calledWith(
      fakeLog.debug,
      'Metadata already set; returning cached metadata.'
    );
  });

  it('should look at JSON when parsing manifest.json', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.io = {
      getFiles: async () => {
        return {
          'manifest.json': {},
        };
      },
      getFileAsString: async () => {
        return validManifestJSON({});
      },
    };
    const metadata = await addonLinter.getAddonMetadata();
    expect(metadata.type).toEqual(constants.PACKAGE_EXTENSION);
  });

  it('should pass selfHosted flag to ManifestJSONParser', async () => {
    const addonLinter = new Linter({ _: ['bar'], selfHosted: true });
    addonLinter.io = {
      getFiles: async () => {
        return {
          'manifest.json': {},
        };
      },
      getFileAsString: async () => {
        return validManifestJSON({});
      },
    };

    const FakeManifestParser = sinon.spy(ManifestJSONParser);
    await addonLinter.getAddonMetadata({
      ManifestJSONParser: FakeManifestParser,
    });
    sinon.assert.calledOnce(FakeManifestParser);
    expect(FakeManifestParser.firstCall.args[2].selfHosted).toEqual(true);
  });

  it.each([
    [true, ['META-INF/manifest.mf']],
    [false, ['META-INF/manifest.non-signature-file']],
    [false, ['ANOTHER-DIR/manifest.mf']],
    [false, ['manifest.mf']],
  ])(
    'should pass isAlreadySigned flag set as %p to ManifestJSONParser with packaged files: %p',
    async (isAlreadySigned, files) => {
      const addonLinter = new Linter({ _: ['bar'] });
      addonLinter.io = {
        getFiles: async () => {
          return {
            'manifest.json': {},
            ...files.reduce((acc, k) => {
              acc[k] = {};
              return acc;
            }, {}),
          };
        },
        getFileAsString: async () => {
          return validManifestJSON({});
        },
      };

      const FakeManifestParser = sinon.spy(ManifestJSONParser);
      await addonLinter.getAddonMetadata({
        ManifestJSONParser: FakeManifestParser,
      });
      sinon.assert.calledOnce(FakeManifestParser);
      expect(FakeManifestParser.firstCall.args[2].isAlreadySigned).toEqual(
        isAlreadySigned
      );
    }
  );

  it('should error if no manifest', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.io = {
      getFiles: async () => {
        return {};
      },
    };
    await addonLinter.getAddonMetadata();
    const { errors } = addonLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.TYPE_NO_MANIFEST_JSON.code);
  });

  it('should validate static theme images defined in the manifest', async () => {
    const files = { 'manifest.json': {} };
    const getFiles = async () => files;

    // Spy the manifest parser.
    let spyManifestParser;
    const FakeManifestParser = sinon.spy((...args) => {
      spyManifestParser = new ManifestJSONParser(...args);
      spyManifestParser.validateStaticThemeImages = sinon.spy();
      return spyManifestParser;
    });

    // Test on a static theme manifest.
    const addonLinterTheme = new Linter({ _: ['bar'] });
    addonLinterTheme.io = {
      getFiles,
      getFileAsString: async () => {
        return validStaticThemeManifestJSON({});
      },
    };

    const themeMetadata = await addonLinterTheme.getAddonMetadata({
      ManifestJSONParser: FakeManifestParser,
    });
    expect(themeMetadata.type).toEqual(constants.PACKAGE_EXTENSION);
    sinon.assert.calledOnce(FakeManifestParser);
    sinon.assert.calledOnce(spyManifestParser.validateStaticThemeImages);

    // Test on a non theme manifest.
    const addonLinterExt = new Linter({ _: ['bar'] });
    addonLinterExt.io = {
      getFiles,
      getFileAsString: async () => {
        return validManifestJSON({});
      },
    };

    const extMetadata = await addonLinterExt.getAddonMetadata({
      ManifestJSONParser: FakeManifestParser,
    });
    expect(extMetadata.type).toEqual(constants.PACKAGE_EXTENSION);
    sinon.assert.calledTwice(FakeManifestParser);
    sinon.assert.notCalled(spyManifestParser.validateStaticThemeImages);
  });
});

describe('Linter.extractMetadata()', () => {
  const fakeConsole = {
    error: sinon.stub(),
    log: sinon.stub(),
  };

  it('should use Directory class if isDirectory() is true', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const fakeMetadata = { type: 1, somethingelse: 'whatever' };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = async () => {
      return {
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      };
    };

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeDirectory extends FakeIOBase {}

    const metadata = await addonLinter.extractMetadata({
      _Directory: FakeDirectory,
      _console: fakeConsole,
    });
    expect(metadata).toEqual(fakeMetadata);
    expect(addonLinter.io).toBeInstanceOf(FakeDirectory);
  });

  it('should use Crx class if filename ends in .crx', async () => {
    const addonLinter = new Linter({ _: ['foo.crx'] });
    const fakeMetadata = { type: 1, somethingelse: 'whatever' };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeCrx extends FakeIOBase {
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    const metadata = await addonLinter.extractMetadata({
      _Crx: FakeCrx,
      _console: fakeConsole,
    });
    expect(metadata).toEqual(fakeMetadata);
    expect(addonLinter.io).toBeInstanceOf(FakeCrx);
  });

  it('should configure a file filter on the IO object', async () => {
    const shouldScanFile = sinon.spy(() => true);

    const addonLinter = new Linter({
      _: ['foo.crx'],
      shouldScanFile,
    });

    const fakeMetadata = { type: 1, somethingelse: 'whatever' };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = async () => {
      return {
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      };
    };

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    const setScanFileCallback = sinon.stub();

    class FakeDirectory extends FakeIOBase {
      setScanFileCallback(...args) {
        setScanFileCallback(...args);
      }
    }

    await addonLinter.extractMetadata({ _Directory: FakeDirectory });
    expect(addonLinter.io).toBeInstanceOf(FakeDirectory);
    sinon.assert.calledOnce(setScanFileCallback);
    expect(typeof setScanFileCallback.firstCall.args[0]).toEqual('function');
    sinon.assert.notCalled(shouldScanFile);
    setScanFileCallback.firstCall.args[0]();
    sinon.assert.calledOnce(shouldScanFile);
  });

  it('should return metadata', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const fakeMetadata = { type: 1, somethingelse: 'whatever' };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    addonLinter.markSpecialFiles = async (addonMetadata) => {
      return addonMetadata;
    };

    class FakeXpi extends FakeIOBase {}

    const metadata = await addonLinter.extractMetadata({
      _Xpi: FakeXpi,
      _console: fakeConsole,
    });

    expect(metadata).toEqual(fakeMetadata);
  });

  it('should return errors as part of metadata JSON.', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: true });

    // Invoke an error so we can make sure we see it in the
    // output.
    addonLinter.collector.addError({
      code: 'FAKE_METADATA_ERROR',
      message: 'Fake metadata error',
      description: 'Fake metadata error description',
    });
    const fakeMetadata = { type: 1 };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    addonLinter.markSpecialFiles = async (addonMetadata) => {
      return addonMetadata;
    };

    class FakeXpi extends FakeIOBase {}

    await addonLinter.extractMetadata({
      _Xpi: FakeXpi,
      _console: fakeConsole,
    });
    sinon.assert.calledOnce(addonLinter.toJSON);
    const inputObject = addonLinter.toJSON.firstCall.args[0].input;
    expect(inputObject.hasErrors).toEqual(true);
    expect(inputObject.metadata).toEqual(fakeMetadata);
    expect(inputObject.errors.length).toEqual(1);
    expect(inputObject.errors[0].code).toEqual('FAKE_METADATA_ERROR');
  });

  // Uses our empty-with-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-3.2.1.min.js (minified jQuery)
  // - index.js
  // - package.json
  // - README.md
  it('should flag empty files in a ZIP.', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/empty-with-library.zip'],
    });
    const markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');

    const metadata = await addonLinter.extractMetadata({
      _console: fakeConsole,
    });
    sinon.assert.calledOnce(markEmptyFilesSpy);
    expect(metadata.emptyFiles).toEqual(['data/empty.js']);
  });

  // Uses our empty-with-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-3.2.1.min.js (minified jQuery)
  // - index.js
  // - package.json
  // - README.md
  it('should flag known JS libraries in a ZIP.', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/empty-with-library.zip'],
    });
    const markJSFilesSpy = sinon.spy(addonLinter, '_markJSLibs');

    const metadata = await addonLinter.extractMetadata({
      _console: fakeConsole,
    });
    sinon.assert.calledOnce(markJSFilesSpy);
    expect(Object.keys(metadata.jsLibs).length).toEqual(1);
    expect(metadata.jsLibs).toEqual({
      'data/jquery-3.2.1.min.js': 'jquery.3.2.1.jquery.min.js',
    });
  });

  it('should flag known JS libraries', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const markJSFilesSpy = sinon.spy(addonLinter, '_markJSLibs');
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();

    const fakeFiles = {
      'angular.js': 'angular-1.2.28.min.js',
      'my/real/files/notalib.js': 'not-a-library.js',
      'my/real/files/alsonotalib.js': 'not-a-library.js',
      'my/nested/library/path/j.js': 'jquery-3.2.1.min.js',
    };

    class FakeXpi extends FakeIOBase {
      async getFile(filename) {
        return this.getFileAsString(filename);
      }

      async getFiles() {
        const files = {};
        files['manifest.json'] = { uncompressedSize: 839 };
        Object.keys(fakeFiles).forEach((filename) => {
          files[filename] = { uncompressedSize: 5 };
        });
        return files;
      }

      async getFilesByExt() {
        return Object.keys(fakeFiles).concat([constants.MANIFEST_JSON]);
      }

      async getFileAsString(filename) {
        return filename === constants.MANIFEST_JSON
          ? validManifestJSON()
          : fs.readFileSync(
              `tests/fixtures/jslibs/${fakeFiles[filename]}`,
              'utf-8'
            );
      }
    }

    const metadata = await addonLinter.extractMetadata({
      _console: fakeConsole,
      _Xpi: FakeXpi,
    });
    sinon.assert.calledOnce(markJSFilesSpy);
    expect(Object.keys(metadata.jsLibs).length).toEqual(1);
    expect(metadata.jsLibs).toEqual({
      'my/nested/library/path/j.js': 'jquery.3.2.1.jquery.min.js',
    });

    const { notices } = addonLinter.collector;
    expect(notices.length).toEqual(1);
    expect(notices[0].code).toEqual(messages.KNOWN_LIBRARY.code);
  });

  it('should not scan known JS libraries', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scan = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();

    const fakeFiles = {
      'my/nested/library/path/j.js': 'jquery-3.2.1.min.js',
    };

    class FakeXpi extends FakeIOBase {
      async getFile(path) {
        return fs.readFileSync(
          `tests/fixtures/jslibs/${fakeFiles[path]}`,
          'utf-8'
        );
      }

      async getFiles() {
        const files = {};
        Object.keys(fakeFiles).forEach((filename) => {
          files[filename] = { uncompressedSize: 5 };
        });
        return files;
      }

      async getFilesByExt() {
        return Object.keys(fakeFiles);
      }
    }

    await addonLinter.extractMetadata({
      _console: fakeConsole,
      _Xpi: FakeXpi,
    });
    expect(addonLinter.collector.warnings.length).toBe(0);
  });

  // Uses our angular-bad-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - angular-1.2.28.min.js (minified Angular)
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-3.2.1.min.js (minified jQuery)
  // - index.js
  // - package.json
  // - README.md
  it('should flag banned JS libraries in a ZIP.', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/angular-bad-library.zip'],
    });
    const markBannedSpy = sinon.spy(addonLinter, '_markBannedLibs');

    const metadata = await addonLinter.extractMetadata({
      _console: fakeConsole,
    });
    sinon.assert.calledOnce(markBannedSpy);
    expect(Object.keys(metadata.jsLibs).length).toEqual(2);
    expect(metadata.jsLibs).toEqual({
      'data/angular.min.js': 'angularjs.1.3.3.angular.min.js',
      'data/jquery-3.2.1.min.js': 'jquery.3.2.1.jquery.min.js',
    });

    const { errors } = addonLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.BANNED_LIBRARY.code);
  });

  it('should flag unadvised JS libraries in a ZIP.', () => {
    const addonLinter = new Linter({
      _: ['fake.zip'],
    });
    const fakeUnadvisedLibs = ['test_unadvised_fake_lib.js'];
    const fakeMetadata = {
      jsLibs: {
        'data/unadvised_fake_lib.js': 'test_unadvised_fake_lib.js',
        'data/jquery-3.2.1.min.js': 'jquery.3.2.1.jquery.min.js',
      },
    };

    addonLinter._markBannedLibs(fakeMetadata, fakeUnadvisedLibs);
    expect(Object.keys(fakeMetadata.jsLibs).length).toEqual(2);
    expect(fakeMetadata.jsLibs).toEqual({
      'data/unadvised_fake_lib.js': 'test_unadvised_fake_lib.js',
      'data/jquery-3.2.1.min.js': 'jquery.3.2.1.jquery.min.js',
    });

    const { warnings } = addonLinter.collector;
    expect(warnings.length).toEqual(1);
    expect(warnings[0].code).toEqual(messages.UNADVISED_LIBRARY.code);
  });

  it('should flag potentially minified JS files', async () => {
    const addonLinter = new Linter({ _: ['foo'] });
    const markUnknownOrMinifiedCodeSpy = sinon.spy(
      addonLinter,
      '_markUnknownOrMinifiedCode'
    );

    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scanFiles = () => Promise.resolve();

    // suppress output.
    addonLinter.print = sinon.stub();

    const read = (filename) => {
      return fs.readFileSync(`tests/fixtures/jslibs/${filename}`, 'utf-8');
    };

    const fakeFiles = {
      // Regular library, should be in `jsLibs` and not matched as a minified
      // file.
      'jquery.js': read('jquery-3.2.1.min.js'),

      // Regular libraries but modified so the hashes differ. They should
      // be matched by `markUnknownOrMinifiedCode`.
      'modified-jquery.js': read('jquery-3.2.1-modified.js'),
      'modified-angular.js': read('angular-1.2.28-modified.js'),

      // sourceMap(URL) matching is a good indicator for minified code.
      'minified-with-sourcemap.js': read('minified-with-sourcemap.js'),
      'sourcemap-with-external-url.js': oneLine`
        //# sourceMappingURL=http://example.com/path/to/your/sourcemap.map`,

      // Should match indentation detection, it's less than 500 chars long.
      'minified-no-nl.js': "(function(){alert('foo')});".repeat(10),

      // Should not match because > 20% of lines that are properly indented
      'minified-less-than-20percent.js': read(
        'minified-less-than-20percent.js'
      ).trim(),
    };

    class FakeXpi extends FakeIOBase {
      getFile(filename) {
        return this.getFileAsString(filename);
      }

      async getFiles() {
        const files = {};
        Object.keys(fakeFiles).forEach((filename) => {
          files[filename] = { uncompressedSize: 5 };
        });
        return files;
      }

      async getFilesByExt() {
        return Object.keys(fakeFiles);
      }

      async getFileAsString(filename) {
        return fakeFiles[filename];
      }
    }

    const metadata = await addonLinter.extractMetadata({
      _console: fakeConsole,
      _Xpi: FakeXpi,
    });
    sinon.assert.calledOnce(markUnknownOrMinifiedCodeSpy);
    expect(metadata.unknownMinifiedFiles).toEqual([
      'modified-jquery.js',
      'modified-angular.js',
      'minified-with-sourcemap.js',
      'sourcemap-with-external-url.js',
      'minified-no-nl.js',
    ]);
    expect(metadata.jsLibs).toEqual({
      'jquery.js': 'jquery.3.2.1.jquery.min.js',
    });
  });

  it('should use size attribute if uncompressedSize is undefined', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = async () => {
      return {
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      };
    };
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();
    const markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');
    class FakeDirectory extends FakeIOBase {
      async getFiles() {
        return {
          'dictionaries/something': { size: 5 },
          whatever: { size: 0 },
        };
      }
    }
    const metadata = await addonLinter.extractMetadata({
      _Directory: FakeDirectory,
      _console: fakeConsole,
    });
    sinon.assert.calledOnce(markEmptyFilesSpy);
    expect(metadata.emptyFiles).toEqual(['whatever']);
  });

  it('should error if no size attributes are found', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();
    const markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');
    class FakeXpi extends FakeIOBase {
      async getFiles() {
        return {
          'dictionaries/something': { uncompressedSize: 5 },
          whatever: {},
        };
      }
    }
    await expect(
      addonLinter.scan({ _Xpi: FakeXpi, _console: fakeConsole })
    ).rejects.toThrow('No size available for whatever');
    sinon.assert.calledOnce(markEmptyFilesSpy);
  });

  it('should error if file size of a non-binary file is too large', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    // suppress output.
    addonLinter.print = sinon.stub();
    const largeFileSize = constants.MAX_FILE_SIZE_TO_PARSE_MB * 1024 * 1024 + 1;
    class FakeXpi extends FakeIOBase {
      files = {
        'manifest.json': { uncompressedSize: 839 },
        'myfile.css': { uncompressedSize: largeFileSize },
        'myfile.js': { uncompressedSize: largeFileSize },
        'some.exe': { uncompressedSize: largeFileSize },
      };

      getFile(filename) {
        return this.getFileAsString(filename);
      }

      async getFiles() {
        return this.files;
      }

      async getFilesByExt(type) {
        return type === 'js' ? ['myfile.js'] : ['myfile.css'];
      }

      async getFileAsString(filename) {
        return filename === constants.MANIFEST_JSON
          ? validManifestJSON()
          : 'const foo = "bar";';
      }
    }
    await addonLinter.scan({ _Xpi: FakeXpi, _console: fakeConsole });
    expect(addonLinter.collector.errors[0].code).toEqual(
      messages.FILE_TOO_LARGE.code
    );
    // JS files that are too large should be flagged. As of March 2024, we no
    // longer report "large" CSS files.
    expect(addonLinter.collector.errors.length).toBe(1);
  });

  it('should ignore large binary files', async () => {
    const addonLinter = new Linter({ _: ['bar'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    // suppress output.
    addonLinter.print = sinon.stub();
    const largeFileSize = constants.MAX_FILE_SIZE_TO_PARSE_MB * 1024 * 1024 * 4;
    class FakeXpi extends FakeIOBase {
      files = {
        'manifest.json': { uncompressedSize: 839 },
        'myfile.jpg': { uncompressedSize: largeFileSize },
      };

      getFile(filename) {
        return this.getFileAsString(filename);
      }

      async getFiles() {
        return this.files;
      }

      async getFilesByExt(type) {
        return type === 'json' ? ['manifest.json'] : ['myfile.jpg'];
      }

      async getFileAsString(filename) {
        return filename === constants.MANIFEST_JSON ? validManifestJSON() : '';
      }
    }
    await addonLinter.scan({ _Xpi: FakeXpi, _console: fakeConsole });
    expect(addonLinter.collector.errors.length).toBe(0);
  });

  // Total zip size is 96080 but only a handful of files are actually
  // scanned.

  // Archive:  tests/fixtures/empty-with-library.zip
  // Skipped Length   Date       Time   Name
  // ------- -------  ---------- -----  ----
  //           593    2015-11-28 19:46  bootstrap.js
  //   X         0    2017-05-09 15:09  data/
  //   X      6148    2017-05-09 15:09  data/.DS_Store
  //   X         0    2017-05-09 15:09  __MACOSX/
  //   X         0    2017-05-09 15:09  __MACOSX/data/
  //   X       120    2017-05-09 15:09  __MACOSX/data/._.DS_Store
  //          1420    2015-11-28 19:46  data/change-text.js
  //             0    2015-11-28 19:46  data/empty.js
  //   X     86659    2017-03-20 20:01  data/jquery-3.2.1.min.js
  //           195    2017-03-20 20:01  __MACOSX/data/._jquery-3.2.1.min.js
  //           421    2015-11-28 19:46  index.js
  //           218    2016-06-30 16:10  manifest.json
  //           277    2015-11-28 19:46  package.json
  //   X        29    2015-11-28 19:46  README.md
  // -------                   -------
  //  96080                    14 files

  it('should collect total size of all scanned files', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/empty-with-library.zip'],
    });

    addonLinter.print = sinon.stub();

    await addonLinter.scan({ _console: fakeConsole });
    expect(addonLinter.output.metadata.totalScannedFileSize).toEqual(2929);
  });

  it('should flag coin miners', async () => {
    const addonLinter = new Linter({
      _: ['tests/fixtures/webextension_badwords.zip'],
    });
    const markCoinMinerUsageSpy = sinon.spy(addonLinter, '_markCoinMinerUsage');

    // suppress output.
    addonLinter.print = sinon.stub();
    addonLinter.checkFileExists = fakeCheckFileExists;

    class FakeXpi extends FakeIOBase {
      files = {
        'coinhive_disguised_as_preferences.js': { uncompressedSize: 20 },
        'included_in_manifest.json': { uncompressedSize: 20 },
        'coinhive_disguised_renamed.js': { uncompressedSize: 20 },
        'coinhive.min.js': { uncompressedSize: 20 },
      };

      getFile(filename) {
        return this.getFileAsString(filename);
      }

      async getFiles() {
        return this.files;
      }

      async getFileAsString(filename) {
        const contents = fs.readFileSync(
          `tests/fixtures/coinminers/${filename}`,
          'utf-8'
        );
        return contents;
      }
    }
    await addonLinter.scan({ _Xpi: FakeXpi, _console: fakeConsole });
    // Only manifest and js files, binary files like the .png are ignored
    sinon.assert.callCount(markCoinMinerUsageSpy, 4);
    const { warnings } = addonLinter.collector;

    expect(warnings.length).toEqual(5);

    assertHasMatchingError(warnings, {
      code: 'COINMINER_USAGE_DETECTED',
      column: 284,
      line: 2,
      instancePath: 'CoinHive.CONFIG',
      file: 'coinhive_disguised_as_preferences.js',
    });

    assertHasMatchingError(warnings, {
      code: 'COINMINER_USAGE_DETECTED',
      column: 119556,
      line: 26,
      instancePath: 'CryptonightWASMWrapper',
      file: 'coinhive_disguised_as_preferences.js',
    });

    assertHasMatchingError(warnings, {
      code: 'COINMINER_USAGE_DETECTED',
      column: 30,
      line: 12,
      file: 'included_in_manifest.json',
    });

    assertHasMatchingError(warnings, {
      code: 'COINMINER_USAGE_DETECTED',
      column: 134338,
      line: 1,
      instancePath: 'CryptonightWASMWrapper',
      file: 'coinhive_disguised_renamed.js',
    });

    assertHasMatchingError(warnings, {
      code: 'COINMINER_USAGE_DETECTED',
      column: undefined,
      line: undefined,
      instancePath: undefined,
      file: 'coinhive.min.js',
    });
  });
});

describe('Linter.run()', () => {
  const fakeConsole = {
    log: sinon.stub(),
  };

  it('should run extractMetadata() when metadata is true', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: true });
    const fakeMetadata = { type: 1, somethingelse: 'whatever' };
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = async () => {
      return fakeMetadata;
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    sinon
      .stub(addonLinter, 'markSpecialFiles')
      .callsFake(async (addonMetadata) => {
        return addonMetadata;
      });

    class FakeXpi extends FakeIOBase {}

    await addonLinter.run({ _Xpi: FakeXpi, _console: fakeConsole });
    sinon.assert.calledOnce(addonLinter.toJSON);
    sinon.assert.calledOnce(addonLinter.markSpecialFiles);
    expect(addonLinter.toJSON.firstCall.args[0].input).toEqual({
      hasErrors: false,
      metadata: fakeMetadata,
    });
  });

  it('should run scan() when metadata is false', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: false });

    addonLinter.scan = sinon.stub();
    addonLinter.scan.returns(Promise.resolve());

    await addonLinter.run({ _console: fakeConsole });
    sinon.assert.calledOnce(addonLinter.scan);
  });

  it('should surface errors when metadata is true', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: true });
    const expectedError = new Error('metadata explosion');
    addonLinter.toJSON = sinon.stub();
    addonLinter.handleError = sinon.spy();

    addonLinter.getAddonMetadata = async () => {
      throw expectedError;
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi extends FakeIOBase {}

    await expect(
      addonLinter.run({ _Xpi: FakeXpi, _console: fakeConsole })
    ).rejects.toThrow(expectedError);
    sinon.assert.calledOnce(addonLinter.handleError);
  });

  it('should resolve to the linting results object', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: false });

    addonLinter.scan = sinon.stub();
    addonLinter.scan.returns(Promise.resolve());

    const result = await addonLinter.run({ _console: fakeConsole });
    expect(result).toEqual(addonLinter.output);
  });

  it('should resolve to the linting results when metadata is true', async () => {
    const addonLinter = new Linter({ _: ['foo'], metadata: true });

    addonLinter.extractMetadata = sinon.stub();
    addonLinter.extractMetadata.returns(Promise.resolve());

    const result = await addonLinter.run({ _console: fakeConsole });
    expect(result).toEqual(addonLinter.output);
  });

  it('should pass disabled linting rules to Scanner', async () => {
    const addonLinter = new Linter({ _: ['tests/fixtures/good.zip'] });

    const fakeScanner = sinon.stub().returns({
      scan: () => Promise.resolve({ linterMessages: [], scannedFiles: [] }),
    });
    addonLinter.getScanner = sinon.stub().returns(fakeScanner);

    addonLinter.config.disableLinterRules = 'foo,bar, baz';

    await addonLinter.run({ _console: fakeConsole });

    sinon.assert.calledWithNew(fakeScanner);
    sinon.assert.calledWithExactly(
      fakeScanner,
      sinon.match.string, // fileData
      sinon.match.string, // filename
      sinon.match({ disabledRules: 'foo,bar, baz' })
    );
  });

  describe('auto-close', () => {
    class FakeXpi extends FakeIOBase {
      static closeWasCalled = false;

      constructor() {
        super();

        FakeXpi.closeWasCalled = false;
      }

      close() {
        FakeXpi.closeWasCalled = true;
      }
    }

    it('should not close the IO object when auto-close feature is enabled (default)', async () => {
      const addonLinter = new Linter({
        _: ['tests/fixtures/webextension.zip'],
        disableXpiAutoclose: false,
      });

      await addonLinter.run({ _Xpi: FakeXpi });

      expect(FakeXpi.closeWasCalled).toEqual(false);
    });

    it('should close the IO object when auto-close feature is disabled', async () => {
      const addonLinter = new Linter({
        _: ['tests/fixtures/webextension.zip'],
        disableXpiAutoclose: true,
      });

      await addonLinter.run({ _Xpi: FakeXpi });

      expect(FakeXpi.closeWasCalled).toEqual(true);
    });

    it('should not close the IO object when auto-close feature is enabled (default) and metadata is true', async () => {
      const addonLinter = new Linter({
        _: ['tests/fixtures/webextension.zip'],
        metadata: true,
        disableXpiAutoclose: false,
      });

      await addonLinter.run({ _Xpi: FakeXpi });

      expect(FakeXpi.closeWasCalled).toEqual(false);
    });

    it('should close the IO object when auto-close feature is disabled and metadata is true', async () => {
      const addonLinter = new Linter({
        _: ['tests/fixtures/webextension.zip'],
        metadata: true,
        disableXpiAutoclose: true,
      });

      await addonLinter.run({ _Xpi: FakeXpi });

      expect(FakeXpi.closeWasCalled).toEqual(true);
    });

    it('should work with empty ZIP files', async () => {
      const addonLinter = new Linter({
        _: ['tests/fixtures/empty.zip'],
        disableXpiAutoclose: true,
      });

      await addonLinter.run();

      const { errors } = addonLinter.collector;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.TYPE_NO_MANIFEST_JSON.code);
    });
  });
});
