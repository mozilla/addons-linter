import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';


describe('/manifest_version', () => {
  it('should be invalid due to old manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = 1;
    validate(manifest);
    expect(validate.errors[0].dataPath).toEqual('/manifest_version');
    expect(validate.errors.length).toEqual(1);
  });

  it('should be invalid due to missing manifest_version', () => {
    const manifest = cloneDeep(validManifest);
    manifest.manifest_version = undefined;
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/manifest_version');
    expect(validate.errors[0].params.missingProperty).toEqual(
      'manifest_version'
    );
  });
});
