import cloneDeep from 'lodash.clonedeep';

import { validateLangPack } from 'schema/validator';

import { validLangpackManifestJSON } from '../helpers';

describe('langpack', () => {
  it('should be valid', () => {
    const manifest = cloneDeep(JSON.parse(validLangpackManifestJSON()));
    validateLangPack(manifest);
    expect(validateLangPack.errors).toBeNull();
  });

  it('should fail on missing manifest_version', () => {
    const manifest = cloneDeep(JSON.parse(validLangpackManifestJSON()));
    manifest.manifest_version = null;
    validateLangPack(manifest);
    expect(validateLangPack.errors.length).toEqual(1);
    expect(validateLangPack.errors[0].instancePath).toEqual(
      '/manifest_version'
    );
    expect(validateLangPack.errors[0].message).toEqual('must be integer');
  });

  it('should fail on missing langpack_id', () => {
    const manifest = cloneDeep(JSON.parse(validLangpackManifestJSON()));
    manifest.langpack_id = null;
    validateLangPack(manifest);
    expect(validateLangPack.errors.length).toEqual(1);
    expect(validateLangPack.errors[0].instancePath).toEqual('/langpack_id');
    expect(validateLangPack.errors[0].message).toEqual('must be string');
  });

  it('should fail on langpack_id < 1 character', () => {
    const manifest = cloneDeep(JSON.parse(validLangpackManifestJSON()));
    manifest.langpack_id = 'a';
    validateLangPack(manifest);
    expect(validateLangPack.errors.length).toEqual(1);
    expect(validateLangPack.errors[0].instancePath).toEqual('/langpack_id');
    expect(validateLangPack.errors[0].message).toEqual(
      'must match pattern "^[a-zA-Z][a-zA-Z-]+$"'
    );
  });
});
