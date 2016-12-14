import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/author', () => {

  it('should be valid if a string', () => {
    var manifest = cloneDeep(validManifest);
    manifest.author = 'some string';
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('should be invalid if not a string', () => {
    var manifest = cloneDeep(validManifest);
    manifest.author = {};
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/author');
  });

});
