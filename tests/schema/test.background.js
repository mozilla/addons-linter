import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/background', () => {

  it('script absolute URL should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {scripts: ['http://foo']};
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/background/scripts/0');
    assert.equal(validate.errors[0].message,
                 'should match format "relativeURL"');
  });


  it('script relative URL should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {scripts: ['js/jquery.js', '/js/jquery.js']};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('script relative URL with path should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {scripts: ['foo.png']};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('page absolute URL should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {page: 'http://foo'};
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/background/page');
    assert.equal(validate.errors[0].message,
                 'should match format "relativeURL"');
  });

  it('page relative URL should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {page: 'foo.png'};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('supports persistent', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {persistent: true};
    validate(manifest);
    assert.isNull(validate.errors);
  });

});
