import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


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
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/incognito');
    assert.equal(
      validate.errors[0].message, 'should match pattern "^spanning$"');
  });

});
