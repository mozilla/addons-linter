import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/name', () => {

  it('should be invalid due to name > 45 chars', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = 'a'.repeat(46);
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/name');
  });

  it('should be invalid due to name < 2 chars', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = 'a';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/name');
  });

  it('should be invalid due to missing a name', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = undefined;
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/name');
    assert.equal(validate.errors[0].params.missingProperty, 'name');
  });

});
