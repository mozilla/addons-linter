import sinon from 'sinon';

import BaseValidator from 'validators/base';
import { NotImplentedError } from 'exceptions';


class BaseValidatorWithContents extends BaseValidator {
  _getContents() {
    return new Promise((resolve) => {
      resolve({});
    });
  }
}

describe('Base Validator Class', function() {

  it('should reject when _getContents is not implemented', () => {
    var baseValidator = new BaseValidator('', 'index.html');

    return baseValidator.scan()
      .then(() => {
        assert.fail(null, null, 'Unexpected success');
      })
      .catch((err) => {
        assert.instanceOf(err, NotImplentedError);
        assert.equal(err.message, '_getContents is not implemented');
      });
  });

  it('should run all rules', () => {
    var baseValidator = new BaseValidatorWithContents('', 'index.html');

    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      iAmAAnotherFakeRule: sinon.stub(),
    };

    return baseValidator.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.ok(fakeRules.iAmAAnotherFakeRule.calledOnce);
      });
  });

  it('should run all rules', () => {
    var baseValidator = new BaseValidatorWithContents('', 'index.html');

    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      iAmAAnotherFakeRule: sinon.stub(),
    };

    return baseValidator.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.ok(fakeRules.iAmAAnotherFakeRule.calledOnce);
      });
  });

  it('should not run private function inside rules', () => {
    var baseValidator = new BaseValidatorWithContents('', 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      _iAmAPrivateFunction: sinon.stub(),
    };

    return baseValidator.scan(fakeRules)
      .then(() => {
        assert.ok(fakeRules.iAmAFakeRule.calledOnce);
        assert.notOk(fakeRules._iAmAPrivateFunction.calledOnce);
      });
  });

});
