import Validator from 'validator';

import * as constants from 'const';
import * as messages from 'messages';

import CSSScanner from 'scanners/css';
import { DuplicateZipEntryError } from 'exceptions';
import { fakeMessageData, validRDF } from './helpers';
import { singleLineString} from 'utils';


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
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
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
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
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
    var fakeLstat = () => {
      return Promise.resolve({
        isFile: isFileSpy,
      });
    };
    return addonValidator.checkFileExists(addonValidator.packagePath, fakeLstat)
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "bar" is not a file');
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
    var addonValidator = new Validator({_: ['tests/example.xpi']});
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
    var addonValidator = new Validator({_: ['tests/example.xpi']});
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
    var addonValidator = new Validator({_: ['tests/example.xpi']});
    addonValidator.xpi = {};
    addonValidator.xpi.getFile = () => Promise.resolve();
    addonValidator.getScanner = sinon.stub();
    class fakeScanner {
      scan() {
        return Promise.resolve([{message: 'whatever'}]);
      }
    }
    addonValidator.getScanner.returns(fakeScanner);
    return addonValidator.scanFile('whatever')
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.include(err.message, 'message.type must be defined');
      });
  });

  it('should see an error if scanFiles() blows up', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.checkFileExists = () => Promise.resolve();
    // Stub handleError to prevent output.
    addonValidator.handleError = sinon.stub();
    addonValidator.scanFiles = () => {
      return Promise.reject(new Error('scanFiles explosion'));
    };

    class FakeXpi {
      getMetaData() {
        return Promise.resolve([]);
      }
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    return addonValidator.scan(FakeXpi)
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'scanFiles explosion');
      });
  });

  it('should bubble up the error if scanFile() blows up', () => {
    var addonValidator = new Validator({_: ['foo']});
    // Stub handleError to prevent output.
    addonValidator.handleError = sinon.stub();
    addonValidator.checkFileExists = () => Promise.resolve();
    addonValidator.scanFile = () => {
      return Promise.reject(new Error('scanFile explosion'));
    };

    class FakeXpi {
      getMetaData() {
        return Promise.resolve([]);
      }
      getFilesByExt() {
        return Promise.resolve(['foo.js', 'bar.js']);
      }
    }

    return addonValidator.scan(FakeXpi)
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'scanFile explosion');
      });
  });

  it('should call addError when Xpi rejects with dupe entry', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.checkFileExists = () => Promise.resolve();
    addonValidator.collector.addError = sinon.stub();
    addonValidator.print = sinon.stub();
    addonValidator.detectPackageType = () => Promise.resolve();
    class FakeXpi {
      getMetaData() {
        return Promise.reject(
          new DuplicateZipEntryError('Darnit the zip has dupes!'));
      }
      getFilesByExt() {
        return new Promise((resolve, reject) => {
          return this.getMetaData()
            .then(resolve)
            .catch(reject);
        });
      }
    }
    return addonValidator.scan(FakeXpi)
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
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
    addonValidator.toJSON(true, fakeJSON);
    assert.ok(fakeJSON.stringify.calledWith(sinon.match.any, null, 4));
  });

  it('should pass correct args to JSON.stringify for normal printing', () => {
    var addonValidator = new Validator({_: ['foo']});
    var fakeJSON = {
      stringify: sinon.stub(),
    };
    addonValidator.toJSON(false, fakeJSON);
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
      assert.fail('Should not error on tiny terminal');
    }
  });
});


describe('Validator.detectType()', function() {

  it('should reject on multiple em:type nodes', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getFileAsString: () => {
        return Promise.resolve(
          validRDF('<em:type>2</em:type><em:type>2</em:type>'));
      },
      getMetaData: () => {
        return Promise.resolve({
          'install.rdf': {},
        });
      },
    };
    return addonValidator.detectPackageType()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.equal(err.message, 'Multiple <em:type> elements found');
      });
  });

  it('should collect an error on invalid type value', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getFileAsString: () => {
        return Promise.resolve(validRDF('<em:type>whatevs</em:type>'));
      },
      getMetaData: () => {
        return Promise.resolve({
          'install.rdf': {},
        });
      },
    };

    return addonValidator.detectPackageType()
      .then(() => {
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 2);
        assert.equal(errors[0].code, messages.TYPE_INVALID.code);
        assert.equal(errors[1].code, messages.TYPE_NOT_DETERMINED.code);
      });
  });

  it('should resolve with mapped type value', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getFileAsString: () => {
        return Promise.resolve(validRDF('<em:type>2</em:type>'));
      },
      getMetaData: () => {
        return Promise.resolve({
          'install.rdf': {},
        });
      },
    };

    return addonValidator.detectPackageType()
      .then((packageType) => {
        // Type 2 maps to 1 PACKAGE_EXTENSION
        assert.equal(packageType, constants.PACKAGE_EXTENSION);
      });
  });

  it('should collect a notice if type is missing', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getFileAsString: () => {
        return Promise.resolve(validRDF(''));
      },
      getMetaData: () => {
        return Promise.resolve({
          'install.rdf': {},
        });
      },
    };

    return addonValidator.detectPackageType()
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.TYPE_MISSING.code);
      });
  });

  it('should collect a notice if no install.rdf', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getMetaData: () => {
        return Promise.resolve({});
      },
    };
    return addonValidator.detectPackageType()
      .then(() => {
        var notices = addonValidator.collector.notices;
        assert.equal(notices.length, 1);
        assert.equal(notices[0].code, messages.TYPE_NO_INSTALL_RDF.code);
      });
  });

  it('should fall-back to detecting a dictionary based on layout', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getMetaData: () => {
        return Promise.resolve({
          'dictionaries/something': {},
          'whatever': {},
        });
      },
    };
    return addonValidator.detectPackageType()
      .then((packageType) => {
        assert.equal(packageType, constants.PACKAGE_DICTIONARY);
      });

  });

  it('should fall-back to detect theme based on extension', () => {
    var addonValidator = new Validator({_: ['foo.jar']});
    addonValidator.xpi = {
      getMetaData: () => {
        return Promise.resolve({
          whatever: {},
        });
      },
    };
    return addonValidator.detectPackageType()
      .then((packageType) => {
        assert.equal(packageType, constants.PACKAGE_THEME);
      });

  });

  it('should fall-back to detect extention based on extension', () => {
    var addonValidator = new Validator({_: ['foo.xpi']});
    addonValidator.xpi = {
      getMetaData: () => {
        return Promise.resolve({
          whatever: {},
        });
      },
    };
    return addonValidator.detectPackageType()
      .then((packageType) => {
        assert.equal(packageType, constants.PACKAGE_EXTENSION);
      });

  });

  it('should collect an error if all attempts to detect type fail', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.xpi = {
      getMetaData: () => {
        return Promise.resolve({});
      },
    };
    return addonValidator.detectPackageType()
      .then(() => {
        var errors = addonValidator.collector.errors;
        assert.equal(errors.length, 1);
        assert.equal(errors[0].code, messages.TYPE_NOT_DETERMINED.code);
      });
  });

});
