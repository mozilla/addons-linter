import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/web_accessible_resources', () => {

  it('should be an array', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = 'foo.png';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/web_accessible_resources');
    assert.equal(validate.errors[0].message, 'should be array');
  });

  it('should fail if not an array of strings', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 1];
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/web_accessible_resources/1');
    assert.equal(validate.errors[0].message, 'should be string');
  });

  it('should be array of strings', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 'bar.css'];
    validate(manifest);
    assert.isNull(validate.errors);
  });

});
