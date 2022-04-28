import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/permissions', () => {
  it('should allow a valid permission', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs'];
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('should not allow duplicate permissions', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs', 'tabs'];
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/permissions',
    });
  });

  it('should not allow an invalid permission', () => {
    const manifest = cloneDeep(validManifest);
    manifest.permissions = ['wat'];
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/permissions/0',
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
      validateAddon(manifest);
      expect(validateAddon.errors).toBeNull();
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
      validateAddon(manifest);
      expect(validateAddon.errors).not.toBeNull();
    });
  });
});
