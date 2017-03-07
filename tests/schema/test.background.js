import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/background', () => {

  it('script absolute URL should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {scripts: ['http://foo']};
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/background/scripts/0',
      message: 'should match format "strictRelativeUrl"',
    });
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

  it('scripts supports persistent', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {scripts: ['/js/foo.js'], persistent: true};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('page absolute URL should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {page: 'http://foo'};
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/background/page',
      message: 'should match format "strictRelativeUrl"',
    });
  });

  it('page relative URL should be valid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {page: 'foo.png'};
    validate(manifest);
    assert.isNull(validate.errors);
  });

  it('page supports persistent', () => {
    var manifest = cloneDeep(validManifest);
    manifest.background = {page: 'foo.png', persistent: true};
    validate(manifest);
    assert.isNull(validate.errors);
  });

});
