import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/background', () => {
  it('script absolute URL should be invalid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['http://foo'] };
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/background/scripts/0',
      message: /must match format "strictRelativeUrl"/,
    });
  });

  it('script relative URL should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['js/jquery.js', '/js/jquery.js'] };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('script relative URL with path should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['foo.png'] };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('scripts supports persistent', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { scripts: ['/js/foo.js'], persistent: true };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('page absolute URL should be invalid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'http://foo' };
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/background/page',
      message: /must match format "strictRelativeUrl"/,
    });
  });

  it('page relative URL should be valid', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'foo.png' };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('page supports persistent', () => {
    const manifest = cloneDeep(validManifest);
    manifest.background = { page: 'foo.png', persistent: true };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });
});
