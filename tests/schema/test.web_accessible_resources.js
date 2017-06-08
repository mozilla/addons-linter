import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/web_accessible_resources', () => {

  it('should be an array', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = 'foo.png';
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/web_accessible_resources');
    expect(validate.errors[0].message).toEqual('should be array');
  });

  it('should fail if not an array of strings', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 1];
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/web_accessible_resources/1');
    expect(validate.errors[0].message).toEqual('should be string');
  });

  it('should be array of strings', () => {
    var manifest = cloneDeep(validManifest);
    manifest.web_accessible_resources = ['foo.png', 'bar.css'];
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

});
