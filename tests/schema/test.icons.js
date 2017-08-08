import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';


describe('/icons', () => {
  it('should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { 48: 'icon.png', 96: 'bigger.png' };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('should fail on integer value', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { 48: 1 };
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/icons/48');
    expect(validate.errors[0].message).toEqual('should be string');
  });

  it('should fail on non-number key', () => {
    const manifest = cloneDeep(validManifest);
    manifest.icons = { wat: 'foo' };
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/icons/wat');
    expect(validate.errors[0].message).toEqual(
      'should NOT have additional properties'
    );
  });
});
