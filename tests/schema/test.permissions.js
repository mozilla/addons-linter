import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';


describe('/permissions', () => {

  it('should allow a valid permission', () => {
    var manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs'];
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('should not allow duplicate permissions', () => {
    var manifest = cloneDeep(validManifest);
    manifest.permissions = ['tabs', 'tabs'];
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/permissions',
    });
  });

  it('should not allow an invalid permission', () => {
    var manifest = cloneDeep(validManifest);
    manifest.permissions = ['wat'];
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/permissions/0',
    });
  });

  var matchingPatterns = [
    '*://developer.mozilla.org/*',
    'http://developer.mozilla.org/*',
    'https://foo.com',
    'ftp://do.people.still.use.this',
    'app://wat',
    'file:///etc/hosts',
  ];

  for (var matchPattern of matchingPatterns) {
    it(`should allow the pattern: ${matchPattern}`, () => {
      var manifest = cloneDeep(validManifest);
      manifest.permissions = [matchPattern];
      validate(manifest);
      assert.isNull(validate.errors);
    });
  }

});
