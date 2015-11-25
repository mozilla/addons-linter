import Validator from 'validator';

import * as constants from 'const';
import * as messages from 'messages';

import CSSScanner from 'scanners/css';
import { DuplicateZipEntryError } from 'exceptions';
import { fakeMessageData,
         unexpectedSuccess,
         validManifestJSON } from './helpers';
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


describe('Validator', function() {

  it('should detect an invalid file with ENOENT', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.handleError = sinon.stub();
    var fakeError = new Error('soz');
    fakeError.code = 'ENOENT';
    var fakeLstat = () => {
      return Promise.reject(fakeError);
    };
    return addonValidator.checkFileExists(addonValidator.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "foo" is not a file');
      });
  });

  it('should detect other errors during lstat', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.handleError = sinon.stub();
    var fakeError = new TypeError('soz');
    var fakeLstat = () => {
      return Promise.reject(fakeError);
    };
    return addonValidator.checkFileExists(addonValidator.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, TypeError);
        assert.include(err.message, 'soz');
      });
  });

  it('should reject if not a file', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.handleError = sinon.stub();
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
    return addonValidator.checkFileExists(addonValidator.packagePath, fakeLstat)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "bar" is not a file or directory');
        assert.equal(isFileSpy.callCount, 1);
      });
  });

  it('should provide output via output prop', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError(fakeMessageData);
    var output = addonValidator.output;
    assert.equal(output.count, 1);
    assert.equal(output.summary.errors, 1);
    assert.equal(output.summary.notices, 0);
    assert.equal(output.summary.warnings, 0);
  });


  // Uses our test XPI, with the following file layout:
  //
  // - chrome.manifest
  // - chrome/
  // - components/
  //   - main.js (has a mozIndexedDB assignment)
  //   - secondary.js (nothing bad)
  // - install.rdf
  // - prefs.html
  it('should send JSScanner messages to the collector', () => {
    var addonValidator = new Validator({_: ['tests/fixtures/example.xpi']});
    // Stub print to prevent output.
    addonValidator.print = sinon.stub();

    assert.equal(addonValidator.collector.errors.length, 0);

    return addonValidator.scan()
      .then(() => {
        assert.isAbove(addonValidator.collector.errors.length, 0);
      });
  });

  // Test to make sure we can all files inside an add-on, not just one of each.
  //
  // Uses our test XPI, with the following file layout:
  //
  // - chrome.manifest
  // - chrome/
  // - components/
  //   - main.js (has a mozIndexedDB assignment)
  //   - secondary.js (nothing bad)
  // - install.rdf
  // - prefs.html
  it('should scan all files', () => {
    var addonValidator = new Validator({_: ['tests/fixtures/example.xpi']});
    // Stub print to prevent output.
    addonValidator.print = sinon.stub();

    var getFileSpy = sinon.spy(addonValidator, 'scanFile');

    return addonValidator.scan()
      .then(() => {
        assert.ok(getFileSpy.calledWith('components/main.js'));
        assert.ok(getFileSpy.calledWith('components/secondary.js'));
        assert.ok(getFileSpy.calledWith('install.rdf'));
        assert.ok(getFileSpy.calledWith('prefs.html'));
      });
  });

  it('should throw when message.type is undefined', () => {
    var addonValidator = new Validator({_: ['tests/fixtures/example.xpi']});
    addonValidator.io = {};
    addonValidator.io.getFile = () => Promise.resolve();
    addonValidator.getScanner = sinon.stub();
    class fakeScanner {
      scan() {
        return Promise.resolve([{message: 'whatever'}]);
      }
    }
    addonValidator.getScanner.returns(fakeScanner);
    return addonValidator.scanFile('whatever')
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'message.type must be defined');
      });
  });

  it('should throw when message.type is undefined for metadata scan', () => {
    var addonValidator = new Validator({_: ['tests/example.xpi']});

    class fakeScanner {
      scan() {
        return Promise.resolve([{message: 'whatever'}]);
      }
    }

    return addonValidator.scanMetadata({}, fakeScanner)
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'message.type must be defined');
      });
  });

  it('should add an error to the collector when scanning bad metadata', () => {
    var addonValidator = new Validator({_: ['tests/example.xpi']});

    class fakeScanner {
      scan() {
        return Promise.resolve([{
          code: messages.GUID_TOO_LONG.code,
          message: messages.GUID_TOO_LONG.message,
          description: messages.GUID_TOO_LONG.description,
          type: constants.VALIDATION_ERROR,
        }]);
      }
    }

    assert.equal(addonValidator.collector.length, 0);

    return addonValidator.scanMetadata({}, fakeScanner)
      .then(() => {
        assert.isAbove(addonValidator.collector.length, 0);
      });
  });


  it('should see an error if scanFiles() blows up', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.checkFileExists = fakeCheckFileExists;
    // Stub handleError to prevent output.
    addonValidator.handleError = sinon.stub();
    addonValidator.scanFiles = () => {
      return Promise.reject(new Error('scanFiles explosion'));
    };

    class FakeXpi {
      getFiles() {
        return Promise.resolve([]);
      }
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    return addonValidator.scan({_Xpi: FakeXpi})
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'scanFiles explosion');
      });
  });

  it('should bubble up the error if scanFile() blows up', () => {
    var addonValidator = new Validator({_: ['foo']});
    // Stub handleError to prevent output.
    addonValidator.handleError = sinon.stub();
    addonValidator.checkFileExists = fakeCheckFileExists;
    addonValidator.scanFile = () => {
      return Promise.reject(new Error('scanFile explosion'));
    };

    class FakeXpi {
      getFiles() {
        return Promise.resolve([]);
      }
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    return addonValidator.scan({_Xpi: FakeXpi})
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'scanFile explosion');
      });
  });


  it('should call addError when Xpi rejects with dupe entry', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.checkFileExists = fakeCheckFileExists;
    addonValidator.collector.addError = sinon.stub();
    addonValidator.print = sinon.stub();
    class FakeXpi {
      getFiles() {
        return Promise.reject(
          new DuplicateZipEntryError('Darnit the zip has dupes!'));
      }
      getFilesByExt() {
        return this.getMetadata();
      }
    }
    return addonValidator.scan({_Xpi: FakeXpi})
      .then(unexpectedSuccess)
      .catch(() => {
        assert.ok(
          addonValidator.collector.addError.calledWith(
            messages.DUPLICATE_XPI_ENTRY));
        assert.ok(addonValidator.print.called);
      });
  });

  it('should return the correct chalk func', () => {
    var addonValidator = new Validator({_: ['bar']});
    assert.deepEqual(addonValidator.colorize(
      constants.VALIDATION_ERROR)._styles, ['red']);
    assert.deepEqual(addonValidator.colorize(
      constants.VALIDATION_NOTICE)._styles, ['blue']);
    assert.deepEqual(addonValidator.colorize(
      constants.VALIDATION_WARNING)._styles, ['yellow']);
  });

  it('should throw if invalid type is passed to colorize', () => {
    var addonValidator = new Validator({_: ['bar']});
    assert.throws(() => {
      addonValidator.colorize('whatever');
    }, Error, /colorize passed invalid type/);
  });
});


describe('Validator.getScanner()', function() {

  it('should throw if scanner type is not available', () => {
    var addonValidator = new Validator({_: ['foo']});
    assert.throws(() => {
      addonValidator.getScanner('foo.whatever');
    }, Error, /No scanner available/);
  });

  it('should return CSSScanner', function() {
    var addonValidator = new Validator({_: ['foo']});
    var Scanner = addonValidator.getScanner('foo.css');
    assert.deepEqual(Scanner, CSSScanner);
  });
});


describe('Validator.handleError()', function() {

  it('should show stack if config.stack is true', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.config.stack = true;
    var fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    var fakeConsole = {
      error: sinon.stub(),
    };
    addonValidator.handleError(fakeError, fakeConsole);
    assert.ok(fakeConsole.error.calledWith(fakeError.stack));
  });

  it('should show colorized error ', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.chalk = {};
    addonValidator.chalk.red = sinon.stub();
    var fakeError = new Error('Errol the error');
    fakeError.stack = 'fake stack city limits';
    var fakeConsole = {
      error: sinon.stub(),
    };
    addonValidator.handleError(fakeError, fakeConsole);
    assert.ok(fakeConsole.error.called);
    assert.ok(addonValidator.chalk.red.calledWith('Errol the error'));
  });
});


describe('Validator.print()', function() {

  it('should print as json when config.output is json', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.config.output = 'json';
    addonValidator.toJSON = sinon.stub();
    var fakeConsole = {
      log: sinon.stub(),
    };
    addonValidator.print(fakeConsole);
    assert.ok(addonValidator.toJSON.called);
    assert.ok(fakeConsole.log.called);
  });

  it('should print as json when config.output is text', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.textOutput = sinon.stub();
    addonValidator.config.output = 'text';
    var fakeConsole = {
      log: sinon.stub(),
    };
    addonValidator.print(fakeConsole);
    assert.ok(addonValidator.textOutput.called);
    assert.ok(fakeConsole.log.called);
  });
});


describe('Validator.toJSON()', function() {

  it('should pass correct args to JSON.stringify for pretty printing', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonValidator.toJSON({pretty: true, _JSON: fakeJSON});
    assert.ok(fakeJSON.stringify.calledWith(sinon.match.any, null, 4));
  });

  it('should pass correct args to JSON.stringify for normal printing', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonValidator.toJSON({pretty: false, _JSON: fakeJSON});
    assert.equal(fakeJSON.stringify.getCall(0).args[1], undefined);
    assert.equal(fakeJSON.stringify.getCall(0).args[2], undefined);
  });

  it('should provide JSON via toJSON()', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError(fakeMessageData);
    var json = addonValidator.toJSON();
    var parsedJSON = JSON.parse(json);
    assert.equal(parsedJSON.count, 1);
    assert.equal(parsedJSON.summary.errors, 1);
    assert.equal(parsedJSON.summary.notices, 0);
    assert.equal(parsedJSON.summary.warnings, 0);
  });
});


describe('Validator.textOutput()', function() {

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
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    var text = addonValidator.textOutput(terminalWidth);
    assert.equal(addonValidator.output.summary.errors, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_ERROR');
    assert.include(text, 'whatever error message');
    assert.include(text, 'whatever error description');
  });

  it('should have notice message in textOutput()', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addNotice({
      code: 'WHATEVER_NOTICE',
      message: 'whatever notice message',
      description: 'whatever notice description',
    });
    var text = addonValidator.textOutput(terminalWidth);
    assert.equal(addonValidator.output.summary.notices, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_NOTICE');
    assert.include(text, 'whatever notice message');
    assert.include(text, 'whatever notice description');
  });

  it('should have warning in textOutput()', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addWarning({
      code: 'WHATEVER_WARNING',
      message: 'whatever warning message',
      description: 'whatever warning description',
    });
    var text = addonValidator.textOutput(terminalWidth);
    assert.equal(addonValidator.output.summary.warnings, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_WARNING');
    assert.include(text, 'whatever warning message');
    assert.include(text, 'whatever warning description');
  });

  it('should remove description when terminal is <78 columns wide', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    var text = addonValidator.textOutput(mediumTerminalWidth);
    assert.equal(addonValidator.output.summary.errors, 1);
    assert.notInclude(text, 'Description');
    assert.notInclude(text, 'whatever error description');
  });

  it(singleLineString`should remove columns, description, and lines when
  terminal is < 60 columns wide`, () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });
    var text = addonValidator.textOutput(smallTerminalWidth);
    assert.equal(addonValidator.output.summary.errors, 1);
    assert.notInclude(text, 'Description');
    assert.notInclude(text, 'whatever error description');
    assert.notInclude(text, 'Column');
    assert.notInclude(text, '5');
    assert.notInclude(text, 'Line');
    assert.notInclude(text, '20');
  });

  it('should survive even a 1 column terminal', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
      column: 5,
      line: 20,
    });
    try {
      addonValidator.textOutput(uselesslyTinyTerminalWidth);
      assert.equal(addonValidator.output.summary.errors, 1);
    } catch (e) {
      assert.fail(null, null, 'Should not error on tiny terminal');
    }
  });
});


describe('Validator.getAddonMetadata()', function() {

  it('should init with null metadata', () => {
    var addonValidator = new Validator({
      _: ['tests/fixtures/example.xpi'],
    });

    addonValidator.print = sinon.stub();

    assert.typeOf(addonValidator.addonMetadata, 'null');

    return addonValidator.scan()
      .then(() => {
        return addonValidator.getAddonMetadata();
      })
      .then((metadata) => {
        assert.isAbove(Object.keys(metadata).length, 0);
      });
  });

  it('should cache and return cached addonMetadata', () => {
    var addonValidator = new Validator({
      _: ['tests/fixtures/example.xpi'],
    });

    addonValidator.print = sinon.stub();

    // This should only be called once: when the addonMetadata isn't populated.
    var architectureCall = sinon.spy(addonValidator, '_getAddonArchitecture');

    assert.isFalse(architectureCall.called);

    // `scan()` calls `getAddonMetadata()`, so we consider it called here.
    return addonValidator.scan()
      .then(() => {
        assert.isTrue(architectureCall.calledOnce);
        assert.typeOf(addonValidator.addonMetadata, 'object');
        return addonValidator.getAddonMetadata();
      })
      .then(() => {
        assert.isTrue(architectureCall.calledOnce);
      });
  });

  it('should consider example.xpi a regular add-on', () => {
    var addonValidator = new Validator({
      _: ['tests/fixtures/example.xpi'],
    });

    addonValidator.print = sinon.stub();

    return addonValidator.scan()
      .then(() => {
        return addonValidator.getAddonMetadata();
      })
      .then((metadata) => {
        assert.equal(metadata.architecture, constants.ARCH_DEFAULT);
      });
  });

  it('should recognise it as a Jetpack add-on', () => {
    var addonValidator = new Validator({
      _: ['tests/fixtures/jetpack-1.14.xpi'],
    });

    addonValidator.print = sinon.stub();

    return addonValidator.scan()
      .then(() => {
        return addonValidator.getAddonMetadata();
      })
      .then((metadata) => {
        assert.equal(metadata.architecture, constants.ARCH_JETPACK);
      });
  });

  it('should look at JSON when manifest.json', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({
          'manifest.json': {},
        });
      },
      getFileAsString: () => {
        return Promise.resolve(validManifestJSON({}));
      },
    };
    return addonValidator.getAddonMetadata()
      .then((metadata) => {
        assert.equal(metadata.type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should throw error if both manifest.json and install.rdf found', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({
          'install.rdf': {},
          'manifest.json': {},
        });
      },
    };
    return addonValidator.getAddonMetadata()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.include(err.message, 'Both install.rdf and manifest.json');
      });
  });

  it('should collect a notice if no manifest', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({});
      },
    };
    return addonValidator.getAddonMetadata()
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.TYPE_NO_INSTALL_RDF.code);
      });
  });

});


describe('Validator.detectTypeFromLayout()', function() {

  it('should fall-back to running type detection during scan', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.checkFileExists = fakeCheckFileExists;
    addonValidator.scanFiles = () => Promise.resolve();
    // suppress output.
    addonValidator.print = sinon.stub();
    var detectTypeFromLayoutSpy = sinon.spy(addonValidator,
                                            'detectTypeFromLayout');
    class FakeXpi {
      getFiles() {
        return Promise.resolve({
          'dictionaries/something': {},
          'whatever': {},
        });
      }
      getFilesByExt = () => sinon.stub
    }
    return addonValidator.scan({_Xpi: FakeXpi})
      .then(() => {
        assert.ok(detectTypeFromLayoutSpy.called);
        assert.equal(addonValidator.addonMetadata.type,
                     constants.PACKAGE_DICTIONARY);
      });
  });

  it('should fall-back to detecting a dictionary based on layout', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({
          'dictionaries/something': {},
          'whatever': {},
        });
      },
    };
    return addonValidator.detectTypeFromLayout()
      .then((type) => {
        assert.equal(type, constants.PACKAGE_DICTIONARY);
      });
  });

  it('should fall-back to detect theme based on extension', () => {
    var addonValidator = new Validator({_: ['foo.jar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({
          whatever: {},
        });
      },
    };
    return addonValidator.detectTypeFromLayout()
      .then((type) => {
        assert.equal(type, constants.PACKAGE_THEME);
      });
  });

  it('should fall-back to detect extention based on extension', () => {
    var addonValidator = new Validator({_: ['foo.xpi']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({
          whatever: {},
        });
      },
    };
    return addonValidator.detectTypeFromLayout()
      .then((type) => {
        assert.equal(type, constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect an error if all attempts to detect type fail', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.io = {
      getFiles: () => {
        return Promise.resolve({});
      },
    };
    return addonValidator.detectTypeFromLayout()
      .then(() => {
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.TYPE_NOT_DETERMINED.code);
      });
  });
});


describe('Validator.scanMetadata()', function() {

  it('should return metadata', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};

    class FakeScanner {
      scan() {
        return Promise.resolve([]);
      }
    }

    return addonValidator.scanMetadata(fakeMetadata, FakeScanner)
      .then((metadata) => {
        assert.deepEqual(metadata, fakeMetadata);
      });
  });

  it('should surface messages in scanMetadata', () => {
    var addonValidator = new Validator({_: ['foo'], metadata: true});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};

    class FakeScanner {
      scan() {
        return Promise.resolve([{
          code: messages.GUID_TOO_LONG.code,
          message: messages.GUID_TOO_LONG.message,
          description: messages.GUID_TOO_LONG.description,
          file: 'manifest.json',
          type: constants.VALIDATION_ERROR,
        }]);
      }
    }

    return addonValidator.scanMetadata(fakeMetadata, FakeScanner)
      .then(() => {
        var collector = addonValidator.collector;
        assert.ok(collector.errors.length, 1);
        assert.ok(collector.errors[0].code, messages.GUID_TOO_LONG.code);
      });
  });

});


describe('Validator.extractMetadata()', function() {

  var fakeConsole = {
    log: sinon.stub(),
  };

  it('should use Directory class if isDirectory() is true', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonValidator.toJSON = sinon.stub();

    addonValidator.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.scanMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.checkFileExists = () => {
      return Promise.resolve({
        isFile: () => {
          return false;
        },
        isDirectory: () => {
          return true;
        },
      });
    };

    addonValidator.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeDirectory {

    }

    return addonValidator.extractMetadata({_Directory: FakeDirectory,
                                           _console: fakeConsole}) // jscs:ignore
      .then((metadata) => {
        assert.deepEqual(metadata, fakeMetadata);
        assert.instanceOf(addonValidator.io, FakeDirectory);
      });
  });

  it('should return metadata', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonValidator.toJSON = sinon.stub();

    addonValidator.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.scanMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.checkFileExists = fakeCheckFileExists;

    addonValidator.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi {
      // stub Xpi class.
    }

    return addonValidator.extractMetadata({_Xpi: FakeXpi,
                                           _console: fakeConsole}) // jscs:ignore
      .then((metadata) => {
        assert.deepEqual(metadata, fakeMetadata);
      });
  });
});

describe('Validator.run()', function() {

  var fakeConsole = {
    log: sinon.stub(),
  };


  it('should run extractMetadata() when metadata is true', () => {
    var addonValidator = new Validator({_: ['foo'], metadata: true});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonValidator.toJSON = sinon.stub();

    addonValidator.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.checkFileExists = fakeCheckFileExists;

    addonValidator.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi {
      // stub Xpi class.
    }

    return addonValidator.run({_Xpi: FakeXpi, _console: fakeConsole})
      .then(() => {
        assert.ok(addonValidator.toJSON.called);
        assert.deepEqual(
          addonValidator.toJSON.firstCall.args[0].input, fakeMetadata);
      });
  });

  it('should run scan() when metadata is false', () => {
    var addonValidator = new Validator({_: ['foo'], metadata: false});

    addonValidator.scan = sinon.stub();
    addonValidator.scan.returns(Promise.resolve());

    return addonValidator.run({_console: fakeConsole})
      .then(() => {
        assert.ok(addonValidator.scan.called);
      });
  });

  it('should surface errors when metadata is true', () => {
    var addonValidator = new Validator({_: ['foo'], metadata: true});
    addonValidator.toJSON = sinon.stub();
    addonValidator.handleError = sinon.spy();

    addonValidator.getAddonMetadata = () => {
      return Promise.reject(new Error('metadata explosion'));
    };

    addonValidator.checkFileExists = fakeCheckFileExists;

    addonValidator.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi {
      // stub Xpi class.
    }

    return addonValidator.run({_Xpi: FakeXpi, _console: fakeConsole})
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.ok(addonValidator.handleError.called);
        assert.instanceOf(err, Error);
        assert.include(err.message, 'metadata explosion');
      });
  });

  it('should call scanMetadata when metadata is true', () => {

    var addonValidator = new Validator({_: ['foo'], metadata: true});
    var fakeMetadata = {type: 1, somethingelse: 'whatever'};
    addonValidator.toJSON = sinon.stub();
    sinon.spy(addonValidator, 'scanMetadata');

    addonValidator.getAddonMetadata = () => {
      return Promise.resolve(fakeMetadata);
    };

    addonValidator.checkFileExists = fakeCheckFileExists;

    addonValidator.checkMinNodeVersion = () => {
      return Promise.resolve();
    };

    class FakeXpi {
      // stub Xpi class.
    }
    return addonValidator.run({_Xpi: FakeXpi, _console: fakeConsole})

      .then(() => {
        assert.ok(addonValidator.scanMetadata.called);
      });
  });

});
