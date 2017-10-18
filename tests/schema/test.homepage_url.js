import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';


describe('/homepage_url', () => {
  const validURLs = [
    'https://example.com/some/page',
    'http://foo.com',
    '__MSG_foo^&#__',
  ];

  validURLs.forEach((validURL) => {
    it(`${validURL} should be valid`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.homepage_url = validURL;
      validateAddon(manifest);
      expect(validateAddon.errors).toBeNull();
    });
  });

  const invalidURLs = [
    '__MSG_',
    'wat',
  ];

  invalidURLs.forEach((invalidURL) => {
    it(`${invalidURL} a URI should be invalid`, () => {
      const manifest = cloneDeep(validManifest);
      manifest.homepage_url = invalidURL;
      validateAddon(manifest);
      assertHasMatchingError(validateAddon.errors, {
        dataPath: '/homepage_url',
        message: /should match format "url"/,
      });
      assertHasMatchingError(validateAddon.errors, {
        message: 'should match pattern "^__MSG_.*?__$"',
      });
    });
  });
});
