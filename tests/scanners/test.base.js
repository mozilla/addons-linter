import BaseScanner from 'scanners/base';
import { ignorePrivateFunctions } from 'utils';
import { metadataPassCheck, validMetadata } from '../helpers';


class BaseScannerWithContents extends BaseScanner {
  _getContents() {
    return Promise.resolve({});
  }
}

describe('Base Scanner Class', function() {

  it('scannerName not defined by default', () => {
    expect(() => {
      BaseScanner.scannerName;
    }).toThrow('scannerName is not implemented');
  });

  it('should thrown an error without a filename', () => {
    expect(() => {
      var baseScanner = new BaseScanner(''); // eslint-disable-line
    }).toThrow('Filename is required');

    expect(() => {
      // An empty filename doesn't count either.
      var baseScanner = new BaseScanner('', ''); // eslint-disable-line
    }).toThrow('Filename is required');
  });

  it('should have an options property', () => {
    var baseScanner = new BaseScanner('', 'filename.txt');
    expect(typeof baseScanner.options).toEqual('object');
    // This test assures us the options can be accessed like an object.
    expect(typeof baseScanner.options.someUndefinedProp).toEqual('undefined');

    var baseScannerWithOptions = new BaseScanner('', 'filename.txt', {
      foo: 'bar',
    });
    expect(baseScannerWithOptions.options.foo).toEqual('bar');
  });

  it('should reject when _getContents is not implemented', () => {
    var baseScanner = new BaseScanner('', 'index.html');

    return baseScanner.scan()
      .then(() => {
        expect(false).toBe(true);
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toEqual('_getContents is not implemented');
      });
  });

  it('should run all rules', () => {
    var baseScanner = new BaseScannerWithContents('', 'index.html');

    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      iAmAAnotherFakeRule: sinon.stub(),
    };

    return baseScanner.scan(fakeRules)
      .then(() => {
        expect(fakeRules.iAmAFakeRule.calledOnce).toBeTruthy();
        expect(fakeRules.iAmAAnotherFakeRule.calledOnce).toBeTruthy();
      });
  });

  it('should pass metadata to rules', () => {
    var fakeRules = { metadataPassedCheck: () => {} };

    // This rule calls assert.fail() if no metadata is passed to it.
    sinon.stub(fakeRules, 'metadataPassedCheck').callsFake(metadataPassCheck);

    var scanner = new BaseScannerWithContents('', 'fake.zip', {
      addonMetadata: validMetadata({guid: 'snowflake'}),
    });

    return scanner.scan(fakeRules)
      .then(({linterMessages}) => {
        expect(fakeRules.metadataPassedCheck.called).toBeTruthy();
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not run private function inside rules', () => {
    var baseScanner = new BaseScannerWithContents('', 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      _iAmAPrivateFunction: sinon.stub(),
    };

    return baseScanner.scan(fakeRules)
      .then(() => {
        expect(fakeRules.iAmAFakeRule.calledOnce).toBeTruthy();
        expect(fakeRules._iAmAPrivateFunction.calledOnce).toBeFalsy();
      });
  });

  it('should increment the number of rules run', () => {
    var baseScanner = new BaseScannerWithContents('', 'install.rdf');
    var fakeRules = {
      iAmAFakeRule: sinon.stub(),
      _iAmAPrivateFunction: sinon.stub(),
      iAmTheOtherFakeRule: sinon.stub(),
    };

    return baseScanner.scan(fakeRules)
      .then(() => {
        expect(
          baseScanner._rulesProcessed
        ).toEqual(Object.keys(ignorePrivateFunctions(fakeRules)).length);
      });
  });

  it('should ask for a string', () => {
    expect(BaseScanner.fileResultType).toBeTruthy();
  });
});
