import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';


describe('/permissions', () => {
  it('should allow a valid permission', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs'];
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('should not allow duplicate permissions', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs', 'tabs'];
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/permissions',
    });
  });

  it('should not allow an invalid permission', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['wat'];
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/permissions/0',
    });
  });

  const matchingPatterns = [
    '*://developer.mozilla.org/*',
    'http://developer.mozilla.org/*',
    'https://foo.com/',
    'ftp://do.people.still.use.this/',
    'file:///etc/hosts',
  ];

  matchingPatterns.forEach((matchPattern) => {
    it(`should allow the pattern: ${matchPattern}`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.permissions = [matchPattern];
      validate(manifest);
      expect(validate.errors).toBeNull();
    });
  });

  const invalidMatchingPatterns = [
    // The path is required to start with a slash.
    // See https://mzl.la/2gAyLu4 for more details.
    'https://foo.com',
    'ftp://do.people.still.use.this',

    // app is not in the list of valid schemas: https://mzl.la/2iWLFam
    'app://wat.com/',
  ];

  invalidMatchingPatterns.forEach((invalidMatchPattern) => {
    it(`should not allow the pattern: ${invalidMatchPattern}`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.permissions = [invalidMatchPattern];
      validate(manifest);
      expect(validate.errors).not.toBeNull();
    });
  });
});
