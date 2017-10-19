import BaseScanner from 'scanners/base';
import { ignorePrivateFunctions } from 'utils';

import { metadataPassCheck, validMetadata } from '../helpers';


class BaseScannerWithContents extends BaseScanner {
  _getContents() {
    return Promise.resolve({});
  }
}

describe('Base Scanner Class', () => {
  it('scannerName not defined by default', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-expressions
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
    const baseScanner = new BaseScanner('', 'filename.txt');
    expect(typeof baseScanner.options).toEqual('object');
    // This test assures us the options can be accessed like an object.
    expect(typeof baseScanner.options.someUndefinedProp).toEqual('undefined');

    const baseScannerWithOptions = new BaseScanner('', 'filename.txt', {
      foo: 'bar',
    });
    expect(baseScannerWithOptions.options.foo).toEqual('bar');
  });

  it('should reject when _getContents is not implemented', () => {
    const baseScanner = new BaseScanner('', 'index.html');

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
    const baseScanner = new BaseScannerWithContents('', 'index.html');

    const fakeRules = {
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
    const fakeRules = { metadataPassedCheck: () => {} };

    // This rule calls assert.fail() if no metadata is passed to it.
    sinon.stub(fakeRules, 'metadataPassedCheck').callsFake(metadataPassCheck);

    const scanner = new BaseScannerWithContents('', 'fake.zip', {
      addonMetadata: validMetadata({ guid: 'snowflake' }),
    });

    return scanner.scan(fakeRules)
      .then(({ linterMessages }) => {
        expect(fakeRules.metadataPassedCheck.called).toBeTruthy();
        expect(linterMessages.length).toEqual(0);
      });
  });

  it('should not run private function inside rules', () => {
    const baseScanner = new BaseScannerWithContents('', 'manifest.json');
    const fakeRules = {
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
    const baseScanner = new BaseScannerWithContents('', 'manifest.json');
    const fakeRules = {
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
