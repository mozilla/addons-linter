import Validator from 'validator';

import * as messages from 'messages';
import { fakeMessageData } from './helpers';
import { DuplicateZipEntryError } from 'exceptions';


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

    var getFileSpy = sinon.spy(addonValidator, 'scanJSFile');

    return addonValidator.scan()
      .then(() => {
        assert.ok(getFileSpy.calledTwice);
      });
  });

  it('should throw an error if the JS scan fails (file not found)', () => {
    var addonValidator = new Validator({_: ['foo']});

    addonValidator.scanJSFiles = () => Promise.reject();

    return addonValidator.scan()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "foo" is not a file');
      });
  });

  it('should bubble up the error if trying to scan a missing file', () => {
    var addonValidator = new Validator({_: ['foo']});

    addonValidator.scanJSFile = () => Promise.reject();

    return addonValidator.scan()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message, 'Path "foo" is not a file');
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
      getJSFiles() {
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

});
