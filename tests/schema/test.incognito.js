import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';


describe('/incognito', () => {

  it('"spanning" should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.incognito = 'spanning';
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('not "spanning" should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.incognito = 'wat';
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/incognito',
      message: new RegExp(
        '(' +
        // TODO(FxSchema): Switch to just this string.
        'should be equal to one of the allowed values' +
        '|' +
        'should match pattern "\\^spanning\\$"' +
        ')'),
    });
  });

});
