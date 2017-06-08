import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';


describe('/incognito', () => {

  it('"spanning" should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.incognito = 'spanning';
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('not "spanning" should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.incognito = 'wat';
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/incognito',
      message: 'should be equal to one of the allowed values',
    });
  });

});
