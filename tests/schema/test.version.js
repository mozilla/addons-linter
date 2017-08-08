import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';


describe('/version', () => {
  it('should be invalid due to invalid version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = '01';
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/version');
  });

  it('should be invalid due to missing version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = undefined;
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/version');
    expect(validate.errors[0].params.missingProperty).toEqual('version');
  });

  it('should be valid if it is a toolkit version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.version = '1.0.0.0pre0';
    validate(manifest);
    expect(validate.errors).toBeNull();
  });
});
