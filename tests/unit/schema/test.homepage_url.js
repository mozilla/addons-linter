import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

// eslint-disable-next-line jest/no-export
export const VALID_URLS = [
  'https://example.com/some/page',
  'http://foo.com',
  '__MSG_foo^&#__',
];

// eslint-disable-next-line jest/no-export
export const INVALID_URLS = ['__MSG_', 'wat'];

describe('/homepage_url', () => {
  it.each(VALID_URLS)('%s should be valid', (validURL) => {
    const manifest = cloneDeep(validManifest);
    manifest.homepage_url = validURL;
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it.each(INVALID_URLS)('%s should be invalid', (invalidURL) => {
    const manifest = cloneDeep(validManifest);
    manifest.homepage_url = invalidURL;
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/homepage_url',
      message: /must match format "url"/,
    });
    assertHasMatchingError(validateAddon.errors, {
      message: 'must match pattern "^__MSG_.*?__$"',
    });
  });
});
