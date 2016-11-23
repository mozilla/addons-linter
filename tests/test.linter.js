import fs from 'fs';

import Linter from 'linter';

import * as constants from 'const';
import * as messages from 'messages';

import ManifestJSONParser from 'parsers/manifestjson';
import BinaryScanner from 'scanners/binary';
import CSSScanner from 'scanners/css';
import FilenameScanner from 'scanners/filename';
import JSONScanner from 'scanners/json';
import { fakeMessageData,
         unexpectedSuccess,
         validManifestJSON } from './helpers';
import { Xpi } from 'io';
import { singleLineString } from 'utils';


var fakeCheckFileExists = () => {
  return Promise.resolve({
    isDirectory: () => {
      return true;
    },
    isFile: () => {
      return true;
    },
  });
};

class FakeIOBase {
  getFile() {
    return Promise.resolve('');
  }
  getFiles() {
    return Promise.resolve({});
  }
  getFilesByExt() {
    return Promise.resolve([]);
  }
  setScanFileCallback() {
  }
}


describe('Linter', function() {

  it('should detect an invalid file with ENOENT', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.handleError = sinon.stub();
    var fakeError = new Error('soz');
    fakeError.code = 'ENOENT';
    var fakeLstat = () => {
      return Promise.reject(fakeError);
    };
    return addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "foo" is not a file');
      });
  });

  it('should detect other errors during lstat', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.handleError = sinon.stub();
    var fakeError = new TypeError('soz');
    var fakeLstat = () => {
      return Promise.reject(fakeError);
    };
    return addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, TypeError);
        assert.include(err.message, 'soz');
      });
  });

  it('should reject if not a file', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.handleError = sinon.stub();
    var isFileSpy = sinon.spy(() => {
      return false;
    });
    var isDirSpy = sinon.spy(() => {
      return false;
    });

    var fakeLstat = () => {
      return Promise.resolve({
        isFile: isFileSpy,
        isDirectory: isDirSpy,
      });
    };
    return addonLinter.checkFileExists(addonLinter.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "bar" is not a file or directory');
        assert.equal(isFileSpy.callCount, 1);
      });
  });

  it('should provide output via output prop', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError(fakeMessageData);
    var output = addonLinter.output;
    assert.equal(output.count, 1);
    assert.equal(output.summary.errors, 1);
    assert.equal(output.summary.notices, 0);
    assert.equal(output.summary.warnings, 0);
  });

  it('should collect an error when not an xpi/zip', () => {
    var addonLinter = new Linter({_: ['tests/fixtures/not-a-zip.zip']});
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();
    assert.equal(addonLinter.collector.errors.length, 0);
    return addonLinter.scan()
      .catch(() => {
        assert.equal(addonLinter.collector.errors.length, 1);
        assert.equal(addonLinter.collector.errors[0].code,
            messages.BAD_ZIPFILE.code);
      });
  });

  // Uses an extension with a mozIndexedDB warning in it.
  it('should send JSScanner messages to the collector', () => {
    var addonLinter = new Linter({_: ['tests/fixtures/webext_mozdb.zip']});
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    assert.equal(addonLinter.collector.warnings.length, 0);

    return addonLinter.scan()
      .then(() => {
        assert.isAbove(addonLinter.collector.warnings.length, 0);
      });
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
  // - install.rdf
  // - prefs.html
  it('should scan all files', () => {
    var addonLinter = new Linter({_: ['tests/fixtures/old.xpi']});
    // Stub print to prevent output.
    addonLinter.print = sinon.stub();

    var getFileSpy = sinon.spy(addonLinter, 'scanFile');

    return addonLinter.scan()
      .then(() => {
        assert.ok(getFileSpy.calledWith('components/main.js'));
        assert.ok(getFileSpy.calledWith('components/secondary.js'));
        assert.ok(getFileSpy.calledWith('install.rdf'));
        assert.ok(getFileSpy.calledWith('prefs.html'));
      });
  });

  it('should throw when message.type is undefined', () => {
    var addonLinter = new Linter({_: ['tests/fixtures/webextension.zip']});
    addonLinter.io = { files: {whatever: {}} };
    addonLinter.io.getFile = () => Promise.resolve();
    addonLinter.getScanner = sinon.stub();
    class fakeScanner {
      scan() {
        return Promise.resolve([{message: 'whatever'}]);
      }
    }
    addonLinter.getScanner.returns(fakeScanner);
    return addonLinter.scanFile('whatever')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'message.type must be defined');
      });
  });


  it('should see an error if scanFiles() blows up', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.checkFileExists = fakeCheckFileExists;
    // Stub handleError to prevent output.
    addonLinter.handleError = sinon.stub();
    addonLinter.scanFiles = () => {
      return Promise.reject(new Error('scanFiles explosion'));
    };

    class FakeXpi extends FakeIOBase {
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    return addonLinter.scan({_Xpi: FakeXpi})
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'scanFiles explosion');
      });
  });

  it('should call addError when Xpi rejects with dupe entry', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.collector.addError = sinon.stub();
    addonLinter.print = sinon.stub();
    class FakeXpi extends FakeIOBase {
      getFiles() {
        return Promise.reject(
          new Error('DuplicateZipEntry the zip has dupes!'));
      }
      getFilesByExt() {
        return this.getMetadata();
      }
    }
    return addonLinter.scan({_Xpi: FakeXpi})
      .then(unexpectedSuccess)
      .catch(() => {
        assert.ok(
          addonLinter.collector.addError.calledWith(
            messages.DUPLICATE_XPI_ENTRY));
        assert.ok(addonLinter.print.called);
      });
  });

  it('should return the correct chalk func', () => {
    var addonLinter = new Linter({_: ['bar']});
    assert.deepEqual(addonLinter.colorize(
      constants.VALIDATION_ERROR)._styles, ['red']);
    assert.deepEqual(addonLinter.colorize(
      constants.VALIDATION_NOTICE)._styles, ['blue']);
    assert.deepEqual(addonLinter.colorize(
      constants.VALIDATION_WARNING)._styles, ['yellow']);
  });

  it('should throw if invalid type is passed to colorize', () => {
    var addonLinter = new Linter({_: ['bar']});
    assert.throws(() => {
      addonLinter.colorize('whatever');
    }, Error, /colorize passed invalid type/);
  });
});


describe('Linter.getScanner()', function() {

  it('should return BinaryScanner', () => {
    var addonLinter = new Linter({_: ['foo']});
    var Scanner = addonLinter.getScanner('foo.whatever');
    assert.deepEqual(Scanner, BinaryScanner);
  });

  it('should return CSSScanner', function() {
    var addonLinter = new Linter({_: ['foo']});
    var Scanner = addonLinter.getScanner('foo.css');
    assert.deepEqual(Scanner, CSSScanner);
  });

  it('should return JSONScanner', function() {
    var addonLinter = new Linter({_: ['foo']});
    var Scanner = addonLinter.getScanner('locales/en.json');
    assert.deepEqual(Scanner, JSONScanner);
  });

  var shouldBeFilenameScanned = [
    '__MACOSX/foo.txt',
    'wat.dll',
    'META-INF/manifest.mf',
  ];

  for (let filename of shouldBeFilenameScanned) {
    it(`should return FilenameScanner for ${filename}`, () => {
      var addonLinter = new Linter({_: ['foo']});
      var Scanner = addonLinter.getScanner(filename);
      assert.deepEqual(Scanner, FilenameScanner);
    });
  }

});


describe('Linter.handleError()', function() {

  it('should show stack if config.stack is true', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.config.stack = true;
    var fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    var fakeConsole = {
      error: sinon.stub(),
    };
    addonLinter.handleError(fakeError, fakeConsole);
    assert.ok(fakeConsole.error.calledWith(fakeError.stack));
  });

  it('should show colorized error ', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.chalk = {};
    addonLinter.chalk.red = sinon.stub();
    var fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    var fakeConsole = {
      error: sinon.stub(),
    };
    addonLinter.handleError(fakeError, fakeConsole);
    assert.ok(fakeConsole.error.called);
    assert.ok(addonLinter.chalk.red.calledWith('Errol the error'));
  });
});


describe('Linter.print()', function() {

  it('should print as json when config.output is json', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.config.output = 'json';
    addonLinter.toJSON = sinon.stub();
    var fakeConsole = {
      log: sinon.stub(),
    };
    addonLinter.print(fakeConsole);
    assert.ok(addonLinter.toJSON.called);
    assert.ok(fakeConsole.log.called);
  });

  it('should print as json when config.output is text', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.textOutput = sinon.stub();
    addonLinter.config.output = 'text';
    var fakeConsole = {
      log: sinon.stub(),
    };
    addonLinter.print(fakeConsole);
    assert.ok(addonLinter.textOutput.called);
    assert.ok(fakeConsole.log.called);
  });
});


describe('Linter.toJSON()', function() {

  it('should pass correct args to JSON.stringify for pretty printing', () => {
    var addonLinter = new Linter({_: ['foo']});
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({pretty: true, _JSON: fakeJSON});
    assert.ok(fakeJSON.stringify.calledWith(sinon.match.any, null, 4));
  });

  it('should output metadata when config.output is json', () => {
    var addonLinter = new Linter({_: ['foo']});
    addonLinter.config.output = 'json';
    addonLinter.addonMetadata = {
      meta: 'data',
    };
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({pretty: true, _JSON: fakeJSON});
    assert.equal(fakeJSON.stringify.firstCall.args[0].metadata.meta, 'data');
  });

  it('should pass correct args to JSON.stringify for normal printing', () => {
    var addonLinter = new Linter({_: ['foo']});
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonLinter.toJSON({pretty: false, _JSON: fakeJSON});
    assert.equal(fakeJSON.stringify.getCall(0).args[1], undefined);
    assert.equal(fakeJSON.stringify.getCall(0).args[2], undefined);
  });

  it('should provide JSON via toJSON()', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError(fakeMessageData);
    var json = addonLinter.toJSON();
    var parsedJSON = JSON.parse(json);
    assert.equal(parsedJSON.count, 1);
    assert.equal(parsedJSON.summary.errors, 1);
    assert.equal(parsedJSON.summary.notices, 0);
    assert.equal(parsedJSON.summary.warnings, 0);
  });
});


describe('Linter.textOutput()', function() {

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
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    var text = addonLinter.textOutput(terminalWidth);
    assert.equal(addonLinter.output.summary.errors, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_ERROR');
    assert.include(text, 'whatever error message');
    assert.include(text, 'whatever error description');
  });

  it('should have notice message in textOutput()', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addNotice({
      code: 'WHATEVER_NOTICE',
      message: 'whatever notice message',
      description: 'whatever notice description',
    });
    var text = addonLinter.textOutput(terminalWidth);
    assert.equal(addonLinter.output.summary.notices, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_NOTICE');
    assert.include(text, 'whatever notice message');
    assert.include(text, 'whatever notice description');
  });

  it('should have warning in textOutput()', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addWarning({
      code: 'WHATEVER_WARNING',
      message: 'whatever warning message',
      description: 'whatever warning description',
    });
    var text = addonLinter.textOutput(terminalWidth);
    assert.equal(addonLinter.output.summary.warnings, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_WARNING');
    assert.include(text, 'whatever warning message');
    assert.include(text, 'whatever warning description');
  });

  it('should remove description when terminal is <78 columns wide', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    var text = addonLinter.textOutput(mediumTerminalWidth);
    assert.equal(addonLinter.output.summary.errors, 1);
    assert.notInclude(text, 'Description');
    assert.notInclude(text, 'whatever error description');
  });

  it(singleLineString`should remove columns, description, and lines when
  terminal is < 60 columns wide`, () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });
    var text = addonLinter.textOutput(smallTerminalWidth);
    assert.equal(addonLinter.output.summary.errors, 1);
    assert.notInclude(text, 'Description');
    assert.notInclude(text, 'whatever error description');
    assert.notInclude(text, 'Column');
    assert.notInclude(text, '5');
    assert.notInclude(text, 'Line');
    assert.notInclude(text, '20');
  });

  it('should survive even a 1 column terminal', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });
    try {
      addonLinter.textOutput(uselesslyTinyTerminalWidth);
      assert.equal(addonLinter.output.summary.errors, 1);
    } catch (e) {
      assert.fail(null, null, 'Should not error on tiny terminal');
    }
  });
});


describe('Linter.getAddonMetadata()', function() {

  it('should init with null metadata', () => {
    var addonLinter = new Linter({
      _: ['tests/fixtures/webextension.zip'],
    });

    addonLinter.print = sinon.stub();

    assert.typeOf(addonLinter.addonMetadata, 'null');

    return addonLinter.scan()
      .then(() => {
        return addonLinter.getAddonMetadata();
      })
      .then((metadata) => {
        assert.isAbove(Object.keys(metadata).length, 0);
      });
  });

  it('should cache and return cached addonMetadata', () => {
    var addonLinter = new Linter({
      _: ['tests/fixtures/webextension.zip'],
    });

    addonLinter.io = new Xpi(addonLinter.packagePath);
    addonLinter.print = sinon.stub();

    // This should only be called when the addonMetadata _is_ populated.
    var fakeLog = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
    };

    function getMetadata() {
      return addonLinter.getAddonMetadata({_log: fakeLog});
    }

    return getMetadata()
      .then(() => {
        assert.isFalse(fakeLog.debug.called);
        assert.typeOf(addonLinter.addonMetadata, 'object');
      })
      .then(() => getMetadata())
      .then(() => {
        assert.isTrue(fakeLog.debug.called);
        assert.isTrue(fakeLog.debug.calledWith(
          'Metadata already set; returning cached metadata.'));
      });
  });

  it('should look at JSON when parsing manifest.json', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.io = {
      getFiles: () => {
        return Promise.resolve({
          'manifest.json': {},
        });
      },
      getFileAsString: () => {
        return Promise.resolve(validManifestJSON({}));
      },
    };
    return addonLinter.getAddonMetadata()
      .then((metadata) => {
        assert.equal(metadata.type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should pass selfHosted flag to ManifestJSONParser', () => {
    const addonLinter = new Linter({_: ['bar'], selfHosted: true});
    addonLinter.io = {
      getFiles: () => {
        return Promise.resolve({
          'manifest.json': {},
        });
      },
      getFileAsString: () => {
        return Promise.resolve(validManifestJSON({}));
      },
    };

    const FakeManifestParser = sinon.spy(ManifestJSONParser);
    return addonLinter.getAddonMetadata({
      ManifestJSONParser: FakeManifestParser,
    })
      .then(() => {
        assert.equal(FakeManifestParser.called, true);
        assert.equal(FakeManifestParser.firstCall.args[2].selfHosted, true);
      });
  });

  it('should collect an error if manifest.json and install.rdf found', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.io = {
      getFiles: () => {
        return Promise.resolve({
          'install.rdf': {},
          'manifest.json': {},
        });
      },
    };
    return addonLinter.getAddonMetadata()
      .then(() => {
        var errors = addonLinter.collector.errors;
        assert.equal(errors.length, 2);
        assert.equal(errors[0].code, messages.MULITPLE_MANIFESTS.code);
        assert.equal(errors[1].code, messages.TYPE_NOT_DETERMINED.code);
      });
  });

  it('should collect notices if no manifest', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.io = {
      getFiles: () => {
        return Promise.resolve({});
      },
    };
    return addonLinter.getAddonMetadata()
      .then(() => {
        var notices = addonLinter.collector.notices;
        assert.equal(notices.length, 2);
        assert.equal(notices[0].code, messages.TYPE_NO_MANIFEST_JSON.code);
        assert.equal(notices[1].code, messages.TYPE_NO_INSTALL_RDF.code);
      });
  });

});


describe('Linter.extractMetadata()', function() {

  var fakeConsole = {
    error: sinon.stub(),
    log: sinon.stub(),
  };

  it('should use Directory class if isDirectory() is true', () => {
    var addonLinter = new Linter({_: ['foo']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonLinter.checkFileExists = () => {
      return Promise.resolve({
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      });
    };

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeDirectory extends FakeIOBase {
    }

    return addonLinter.extractMetadata({
      _Directory: FakeDirectory,
      _console: fakeConsole,
    }).then((metadata) => {
      assert.deepEqual(metadata, fakeMetadata);
      assert.instanceOf(addonLinter.io, FakeDirectory);
    });
  });

  it('should use Crx class if filename ends in .crx', () => {
    var addonLinter = new Linter({_: ['foo.crx']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
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

    return addonLinter.extractMetadata({_Crx: FakeCrx, _console: fakeConsole})
      .then((metadata) => {
        assert.deepEqual(metadata, fakeMetadata);
        assert.instanceOf(addonLinter.io, FakeCrx);
      });
  });

  it('should configure a file filter on the IO object', () => {
    const shouldScanFile = sinon.spy(() => true);

    const addonLinter = new Linter({
      _: ['foo.crx'],
      shouldScanFile,
    });

    const fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonLinter.checkFileExists = () => {
      return Promise.resolve({
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      });
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

    return addonLinter.extractMetadata({_Directory: FakeDirectory})
      .then(() => {
        assert.instanceOf(addonLinter.io, FakeDirectory);
        assert.equal(setScanFileCallback.called, true);
        assert.strictEqual(setScanFileCallback.firstCall.args[0],
                           shouldScanFile);
      });
  });

  it('should return metadata', () => {
    var addonLinter = new Linter({_: ['foo']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    addonLinter.markSpecialFiles = (addonMetadata) => {
      return Promise.resolve(addonMetadata);
    };

    class FakeXpi extends FakeIOBase {
    }

    return addonLinter.extractMetadata({
      _Xpi: FakeXpi,
      _console: fakeConsole,
    }).then((metadata) => {
      assert.deepEqual(metadata, fakeMetadata);
    });
  });

  it('should return errors as part of metadata JSON.', () => {
    var addonLinter = new Linter({_: ['foo'], metadata: true});

    // Invoke an error so we can make sure we see it in the
    // output.
    addonLinter.collector.addError({
      code: 'FAKE_METADATA_ERROR',
      message: 'Fake metadata error',
      description: 'Fake metadata error description',
    });
    var fakeMetadata = {type: 1};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    addonLinter.markSpecialFiles = (addonMetadata) => {
      return Promise.resolve(addonMetadata);
    };

    class FakeXpi extends FakeIOBase {
    }

    return addonLinter.extractMetadata({
      _Xpi: FakeXpi,
      _console: fakeConsole,
    }).then(() => {
      assert.ok(addonLinter.toJSON.called);
      var inputObject = addonLinter.toJSON.firstCall.args[0].input;
      assert.equal(inputObject.hasErrors, true);
      assert.deepEqual(inputObject.metadata, fakeMetadata);
      assert.equal(inputObject.errors.length, 1);
      assert.equal(inputObject.errors[0].code, 'FAKE_METADATA_ERROR');
    });
  });

  // Uses our empty-with-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-2.1.4.min.js (minified jQuery)
  // - index.js
  // - install.rdf
  // - package.json
  // - README.md
  it('should flag empty files in a ZIP.', () => {
    var addonLinter = new Linter({
      _: ['tests/fixtures/empty-with-library.zip'],
    });
    var markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');

    return addonLinter.extractMetadata({_console: fakeConsole})
      .then((metadata) => {
        assert.ok(markEmptyFilesSpy.called);
        assert.deepEqual(metadata.emptyFiles, ['data/empty.js']);
      });
  });

  // Uses our empty-with-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-2.1.4.min.js (minified jQuery)
  // - index.js
  // - install.rdf
  // - package.json
  // - README.md
  it('should flag known JS libraries in a ZIP.', () => {
    var addonLinter = new Linter({
      _: ['tests/fixtures/empty-with-library.zip'],
    });
    var markJSFilesSpy = sinon.spy(addonLinter, '_markJSLibs');

    return addonLinter.extractMetadata({_console: fakeConsole})
      .then((metadata) => {
        assert.ok(markJSFilesSpy.called);
        assert.equal(Object.keys(metadata.jsLibs).length, 1);
        assert.deepEqual(metadata.jsLibs, {
          'data/jquery-2.1.4.min.js': 'jquery.2.1.4.jquery.min.js',
        });
      });
  });

  it('should flag known JS libraries', function() {
    var addonLinter = new Linter({ _: ['foo'] });
    var markJSFilesSpy = sinon.spy(addonLinter, '_markJSLibs');
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();

    var fakeFiles = {
      'angular.js': 'angular-1.2.28.min.js',
      'my/real/files/notalib.js': 'not-a-library.js',
      'my/real/files/alsonotalib.js': 'not-a-library.js',
      'my/nested/library/path/j.js': 'jquery-2.1.4.min.js',
    };

    class FakeXpi extends FakeIOBase {
      getFile(path) {
        return Promise.resolve(
          fs.readFileSync(`tests/fixtures/jslibs/${fakeFiles[path]}`));
      }
      getFiles() {
        var files = {};
        for (let filename of Object.keys(fakeFiles)) {
          files[filename] = { uncompressedSize: 5 };
        }
        return Promise.resolve(files);
      }
      getFilesByExt() {
        return Promise.resolve(Object.keys(fakeFiles));
      }
    }

    return addonLinter.extractMetadata({
      _console: fakeConsole,
      _Xpi: FakeXpi,
    }).then((metadata) => {
      assert.ok(markJSFilesSpy.called);
      assert.equal(Object.keys(metadata.jsLibs).length, 1);
      assert.deepEqual(metadata.jsLibs, {
        'my/nested/library/path/j.js': 'jquery.2.1.4.jquery.min.js',
      });

      var notices = addonLinter.collector.notices;
      assert.equal(notices.length, 3);
      assert.equal(notices[2].code, messages.KNOWN_LIBRARY.code);
    });
  });

  it('should not scan known JS libraries', function() {
    var addonLinter = new Linter({ _: ['foo'] });
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scan = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();

    var fakeFiles = {
      'my/nested/library/path/j.js': 'jquery-2.2.4.min.js',
    };

    class FakeXpi extends FakeIOBase {
      getFile(path) {
        return Promise.resolve(
          fs.readFileSync(`tests/fixtures/jslibs/${fakeFiles[path]}`));
      }
      getFiles() {
        var files = {};
        for (let filename of Object.keys(fakeFiles)) {
          files[filename] = { uncompressedSize: 5 };
        }
        return Promise.resolve(files);
      }
      getFilesByExt() {
        return Promise.resolve(Object.keys(fakeFiles));
      }
    }

    return addonLinter.extractMetadata({
      _console: fakeConsole,
      _Xpi: FakeXpi,
    }).then(() => {
      assert.lengthOf(addonLinter.collector.warnings, 0);
    });
  });

  // Uses our angular-bad-library extension, with the following file layout:
  //
  // - bootstrap.js
  // - data/
  //   - angular-1.2.28.min.js (minified Angular)
  //   - change-text.js
  //   - empty.js (empty file)
  //   - jquery-2.1.4.min.js (minified jQuery)
  // - index.js
  // - install.rdf
  // - package.json
  // - README.md
  it('should flag banned JS libraries in a ZIP.', () => {
    var addonLinter = new Linter({
      _: ['tests/fixtures/angular-bad-library.zip'],
    });
    var markBannedSpy = sinon.spy(addonLinter, '_markBannedLibs');

    return addonLinter.extractMetadata({_console: fakeConsole})
      .then((metadata) => {
        assert.ok(markBannedSpy.called);
        assert.equal(Object.keys(metadata.jsLibs).length, 2);
        assert.deepEqual(metadata.jsLibs, {
          'data/angular-1.2.28.min.js': 'angularjs.1.2.28.angular.min.js',
          'data/jquery-2.1.4.min.js': 'jquery.2.1.4.jquery.min.js',
        });

        var errors = addonLinter.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.BANNED_LIBRARY.code);
      });
  });

  it('should flag unadvised JS libraries in a ZIP.', () => {
    var addonLinter = new Linter({
      _: ['fake.zip'],
    });
    var fakeUnadvisedLibs = ['test_unadvised_fake_lib.js'];
    var fakeMetadata = {
      jsLibs : {
        'data/unadvised_fake_lib.js': 'test_unadvised_fake_lib.js',
        'data/jquery-2.1.4.min.js': 'jquery.2.1.4.jquery.min.js',
      },
    };

    addonLinter._markBannedLibs(fakeMetadata, fakeUnadvisedLibs);
    assert.equal(Object.keys(fakeMetadata.jsLibs).length, 2);
    assert.deepEqual(fakeMetadata.jsLibs, {
      'data/unadvised_fake_lib.js': 'test_unadvised_fake_lib.js',
      'data/jquery-2.1.4.min.js': 'jquery.2.1.4.jquery.min.js',
    });

    var warnings = addonLinter.collector.warnings;
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].code, messages.UNADVISED_LIBRARY.code);
  });

  it('should use size attribute if uncompressedSize is undefined', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.checkFileExists = () => {
      return Promise.resolve({
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      });
    };
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();
    var markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');
    class FakeDirectory extends FakeIOBase {
      getFiles() {
        return Promise.resolve({
          'dictionaries/something': { size: 5 },
          'whatever': { size: 0},
        });
      }
    }
    return addonLinter.extractMetadata({
      _Directory: FakeDirectory,
      _console: fakeConsole,
    }).then((metadata) => {
      assert.ok(markEmptyFilesSpy.called);
      assert.deepEqual(metadata.emptyFiles, ['whatever']);
    });
  });

  it('should error if no size attributes are found', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.checkFileExists = fakeCheckFileExists;
    addonLinter.scanFiles = () => Promise.resolve();
    // suppress output.
    addonLinter.print = sinon.stub();
    var markEmptyFilesSpy = sinon.spy(addonLinter, '_markEmptyFiles');
    class FakeXpi extends FakeIOBase {
      getFiles() {
        return Promise.resolve({
          'dictionaries/something': { uncompressedSize: 5 },
          'whatever': {},
        });
      }
    }
    return addonLinter.scan({_Xpi: FakeXpi, _console: fakeConsole})
      .catch((err) => {
        assert.ok(markEmptyFilesSpy.called);
        assert.equal(err.message, 'No size available for whatever');
      });
  });

  it('should error if file size of a non-binary file is too large', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.checkFileExists = fakeCheckFileExists;
    // suppress output.
    addonLinter.print = sinon.stub();
    var largeFileSize = (constants.MAX_FILE_SIZE_TO_PARSE_MB * 1024 * 1024) + 1;
    class FakeXpi extends FakeIOBase {
      files = {
        'manifest.json': { uncompressedSize: 839 },
        'myfile.css': { uncompressedSize: largeFileSize },
        'myfile.js': { uncompressedSize: largeFileSize },
      };
      getFile(filename) {
        return this.getFileAsString(filename);
      }
      getFiles() {
        return Promise.resolve(this.files);
      }
      getFilesByExt(type) {
        return Promise.resolve(type === 'js' ? ['myfile.js'] : ['myfile.css']);
      }
      getFileAsString(filename) {
        return Promise.resolve((filename === constants.MANIFEST_JSON) ?
          validManifestJSON() : 'var foo = "bar";');
      }
    }
    return addonLinter.scan({_Xpi: FakeXpi, _console: fakeConsole})
      .then(() => {
        assert.equal(addonLinter.collector.errors[0].code,
                     messages.FILE_TOO_LARGE.code);
        // CSS and JS files that are too large should be flagged.
        assert.lengthOf(addonLinter.collector.errors, 2);
      });
  });

  it('should ignore large binary files', () => {
    var addonLinter = new Linter({_: ['bar']});
    addonLinter.checkFileExists = fakeCheckFileExists;
    // suppress output.
    addonLinter.print = sinon.stub();
    var largeFileSize = constants.MAX_FILE_SIZE_TO_PARSE_MB * 1024 * 1024 * 4;
    class FakeXpi extends FakeIOBase {
      files = {
        'manifest.json': { uncompressedSize: 839 },
        'myfile.jpg': { uncompressedSize: largeFileSize },
      };
      getFile(filename) {
        return this.getFileAsString(filename);
      }
      getFiles() {
        return Promise.resolve(this.files);
      }
      getFilesByExt(type) {
        return Promise.resolve(type === 'json' ? ['manifest.json'] :
                                                 ['myfile.jpg']);
      }
      getFileAsString(filename) {
        return Promise.resolve((filename === constants.MANIFEST_JSON) ?
          validManifestJSON() : '');
      }
    }
    return addonLinter.scan({_Xpi: FakeXpi, _console: fakeConsole})
      .then(() => {
        assert.lengthOf(addonLinter.collector.errors, 0);
      });
  });

});

describe('Linter.run()', function() {

  var fakeConsole = {
    log: sinon.stub(),
  };


  it('should run extractMetadata() when metadata is true', () => {
    var addonLinter = new Linter({_: ['foo'], metadata: true});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonLinter.toJSON = sinon.stub();

    addonLinter.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };
    sinon.stub(addonLinter, 'markSpecialFiles', (addonMetadata) => {
      return Promise.resolve(addonMetadata);
    });

    class FakeXpi extends FakeIOBase {
    }

    return addonLinter.run({_Xpi: FakeXpi, _console: fakeConsole})
      .then(() => {
        assert.ok(addonLinter.toJSON.called);
        assert.ok(addonLinter.markSpecialFiles.called);
        assert.deepEqual(
          addonLinter.toJSON.firstCall.args[0].input,
          {hasErrors: false, metadata: fakeMetadata});
      });
  });

  it('should run scan() when metadata is false', () => {
    var addonLinter = new Linter({_: ['foo'], metadata: false});

    addonLinter.scan = sinon.stub();
    addonLinter.scan.returns(Promise.resolve());

    return addonLinter.run({_console: fakeConsole})
      .then(() => {
        assert.ok(addonLinter.scan.called);
      });
  });

  it('should surface errors when metadata is true', () => {
    var addonLinter = new Linter({_: ['foo'], metadata: true});
    addonLinter.toJSON = sinon.stub();
    addonLinter.handleError = sinon.spy();

    addonLinter.getAddonMetadata = () => {
      return Promise.reject(new Error('metadata explosion'));
    };

    addonLinter.checkFileExists = fakeCheckFileExists;

    addonLinter.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi extends FakeIOBase {
    }

    return addonLinter.run({_Xpi: FakeXpi, _console: fakeConsole})
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.ok(addonLinter.handleError.called);
        assert.instanceOf(err, Error);
        assert.include(err.message, 'metadata explosion');
      });
  });

});
