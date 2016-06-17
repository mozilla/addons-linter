import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/icons', () => {

  it('should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.icons = {48: 'icon.png', 96: 'bigger.png'};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('should fail on integer value', () => {
    var manifest = cloneDeep(validManifest);
    manifest.icons = {48: 1};
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/icons/48');
    assert.equal(validate.errors[0].message, 'should be string');
  });

  it('should fail on non-number key', () => {
    var manifest = cloneDeep(validManifest);
    manifest.icons = {wat: 'foo'};
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/icons/wat');
    assert.equal(validate.errors[0].message,
                 'should NOT have additional properties');
  });
});
