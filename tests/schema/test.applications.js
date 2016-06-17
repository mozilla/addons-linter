import validate from 'schema/validator';
import { validManifest } from './helpers';
import cloneDeep from 'lodash.clonedeep';


describe('/applications/*', () => {
  it('should not require an application object', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications = undefined;
    validate(manifest);
    assert.isNull(validate.errors);
  });
});

describe('/applications/gecko/*', () => {

  it('should not require a gecko object', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko = undefined;
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('should be invalid due to invalid update_url', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.update_url = 'whatevs';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/applications/gecko/update_url');
  });

  it('should be invalid due to invalid strict_min_version type', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.strict_min_version = 42;
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath,
      '/applications/gecko/strict_min_version');
  });

  it('should be invalid due to invalid strict_max_version type', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.strict_max_version = 42;
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath,
      '/applications/gecko/strict_max_version');
  });

  it('should be a valid id (email-like format)', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.id = 'extensionname@example.org';
    assert.ok(validate(manifest));
  });

  it('should be a valid id @whatever', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.id = '@example.org';
    assert.ok(validate(manifest));
  });

  it('should be a valid id (guid format)', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.id = '{daf44bf7-a45e-4450-979c-91cf07434c3d}';
    assert.ok(validate(manifest));
  });

  it('should be invalid id format', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.id = 'whatevs';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath,
      '/applications/gecko/id');
  });

  it('should accept an add-on without an id', () => {
    var manifest = cloneDeep(validManifest);
    manifest.applications.gecko.id = undefined;
    validate(manifest);
    assert.isNull(validate.errors);
  });

});
