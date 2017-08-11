import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';

describe('/author', () => {
  it('should be valid if a string', () => {
    const manifest = cloneDeep(validManifest);
    manifest.author = 'some string';
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('should be invalid if not a string', () => {
    const manifest = cloneDeep(validManifest);
    manifest.author = {};
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/author');
  });
});
