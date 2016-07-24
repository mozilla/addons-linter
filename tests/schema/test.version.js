import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/version', () => {

  it('should be invalid due to invalid version', () => {
    var manifest = cloneDeep(validManifest);
    manifest.version = '01';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/version');
  });

  it('should be invalid due to missing version', () => {
    var manifest = cloneDeep(validManifest);
    manifest.version = undefined;
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/version');
    assert.equal(validate.errors[0].params.missingProperty, 'version');
  });

  it('should be valid if it is a toolkit version', () => {
    var manifest = cloneDeep(validManifest);
    manifest.version = '1.0.0.0pre0';
    validate(manifest);
    assert.isNull(validate.errors);
  });

});
