import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/name', () => {

  it('should be invalid due to name > 45 chars', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = 'a'.repeat(46);
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/name');
  });

  it('should be invalid due to name < 2 chars', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = 'a';
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/name');
  });

  it('should be invalid due to missing a name', () => {
    var manifest = cloneDeep(validManifest);
    manifest.name = undefined;
    validate(manifest);
    expect(validate.errors.length).toEqual(1);
    expect(validate.errors[0].dataPath).toEqual('/name');
    expect(validate.errors[0].params.missingProperty).toEqual('name');
  });

});
