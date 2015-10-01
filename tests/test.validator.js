import Validator from 'validator';



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

});
