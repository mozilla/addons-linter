import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/background', () => {
  it('script absolute URL should be invalid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['http://foo'] };
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/background/scripts/0',
      message: /should match format "strictRelativeUrl"/,
    });
  });


  it('script relative URL should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['js/jquery.js', '/js/jquery.js'] };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('script relative URL with path should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['foo.png'] };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('scripts supports persistent', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['/js/foo.js'], persistent: true };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('page absolute URL should be invalid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'http://foo' };
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/background/page',
      message: /should match format "strictRelativeUrl"/,
    });
  });

  it('page relative URL should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'foo.png' };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });

  it('page supports persistent', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'foo.png', persistent: true };
    validate(manifest);
    expect(validate.errors).toBeNull();
  });
});
