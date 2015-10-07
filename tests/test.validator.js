import Validator from 'validator';

import * as constants from 'const';
import * as messages from 'messages';
import { fakeMessageData } from './helpers';
import { DuplicateZipEntryError } from 'exceptions';


describe('Validator', function() {

  it('should throw if scanner type is not available', () => {
    var addonValidator = new Validator({_: ['foo']});
    assert.throws(() => {
      addonValidator.getScanner('foo.whatever');
    }, Error, /No scanner available/);
  });

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

  // Uses our test XPI, with the following file layout:
  //
  // - chrome.manifest
  // - chrome/
  // - components/
  //   - main.js (has a mozIndexedDB assignment)
  //   - secondary.js (nothing bad)
  // - install.rdf
  it('should send JSScanner messages to the collector', () => {
    var addonValidator = new Validator({_: ['tests/example.xpi']});

    assert.equal(addonValidator.collector.errors.length, 0);

    return addonValidator.scan()
      .then(() => {
        assert.isAbove(addonValidator.collector.errors.length, 0);
      });
  });

  // Test to make sure we can all JS files inside an add-on, not just one.
  it('should scan all JS files', () => {
    var addonValidator = new Validator({_: ['tests/example.xpi']});

    var getFileSpy = sinon.spy(addonValidator, 'scanFile');

    return addonValidator.scan()
      .then(() => {
        assert.ok(getFileSpy.calledTwice);
      });
  });

  it('should see an error if scanFiles() blows up', () => {
    var addonValidator = new Validator({_: ['foo']});
    addonValidator.checkFileExists = () => Promise.resolve();
    addonValidator.scanFiles = () => {
      return Promise.reject(new Error('scanFiles explosion'));
    };

    class FakeXpi {
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
    addonValidator.checkFileExists = () => Promise.resolve();
    addonValidator.scanFile = () => {
      return Promise.reject(new Error('scanFile explosion'));
    };

    class FakeXpi {
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

  it('should have error in textOutput()', () => {
    var addonValidator = new Validator({_: ['bar']});
    addonValidator.collector.addError({
      code: 'WHATEVER_ERROR',
      message: 'whatever error message',
      description: 'whatever error description',
    });
    var text = addonValidator.textOutput();
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
    var text = addonValidator.textOutput();
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
    var text = addonValidator.textOutput();
    assert.equal(addonValidator.output.summary.warnings, 1);
    assert.include(text, 'Validation Summary:');
    assert.include(text, 'WHATEVER_WARNING');
    assert.include(text, 'whatever warning message');
    assert.include(text, 'whatever warning description');
  });
});
