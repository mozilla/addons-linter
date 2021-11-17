import Dispensary from 'dispensary';

describe(__filename, () => {
  it('should match a hash', () => {
    let h = '9320ea11f6d427aec4949634dc8676136b2fa8cdad289d22659b44541abb8c51';
    h += ' mylib.1.0.0.js';

    const dispensary = new Dispensary();
    const getSpy = sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [h];
    });
    const match = dispensary.match('hasher');

    expect(match).toBeTruthy();
    expect(match).toEqual('mylib.1.0.0.js');
    expect(getSpy.calledOnce).toBe(true);
  });

  it('should not match contents not in the hash array', () => {
    let h = '9320ea11f6d427aec4949634dc8676136b2fa8cdad289d22659b44541abb8c51';
    h += ' mylib.1.0.0.js';

    const dispensary = new Dispensary();
    const getSpy = sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [h];
    });
    const match = dispensary.match('not a match');

    expect(match).toBeFalsy();
    expect(getSpy.calledOnce).toBe(true);
  });
});
