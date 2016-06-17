import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/manifest_version', () => {

  it('should be invalid due to old manifest_version', () => {
    var manifest = cloneDeep(validManifest);
    manifest.manifest_version = 1;
    validate(manifest);
    assert.equal(validate.errors[0].dataPath, '/manifest_version');
    assert.equal(validate.errors.length, 1);
  });

  it('should be invalid due to missing manifest_version', () => {
    var manifest = cloneDeep(validManifest);
    manifest.manifest_version = undefined;
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/manifest_version');
    assert.equal(validate.errors[0].params.missingProperty, 'manifest_version');
  });

});
