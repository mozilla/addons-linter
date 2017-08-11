import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

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
      validate(manifest);
      expect(validate.errors).toBeNull();
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
      validate(manifest);
      assertHasMatchingError(validate.errors, {
        dataPath: '/homepage_url',
        message: /should match format "url"/,
      });
      assertHasMatchingError(validate.errors, {
        message: 'should match pattern "^__MSG_.*?__$"',
      });
    });
  });
});
