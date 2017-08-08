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
    // FIXME: the loop in this test was previously broken.
    // These lines don't match the schema.
    // 'https://foo.com',
    // 'ftp://do.people.still.use.this',
    // 'app://wat/',
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
});
