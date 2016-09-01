import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/homepage_url', () => {

  const validURLs = [
    'https://example.com/some/page',
    'http://foo.com',
    '__MSG_foo^&#__',
  ];

  for (let validURL of validURLs) {
    it(`${validURL} should be valid`, () => {
      var manifest = cloneDeep(validManifest);
      manifest.homepage_url = validURL;
      validate(manifest);
      assert.isNull(validate.errors);
    });
  }

  const invalidURLs = [
    '__MSG_',
    'wat',
  ];

  for (let invalidURL of invalidURLs) {
    it(`${invalidURL} a URI should be invalid`, () => {
      var manifest = cloneDeep(validManifest);
      manifest.homepage_url = invalidURL;
      validate(manifest);
      assert.equal(validate.errors.length, 3);
      assert.equal(validate.errors[0].dataPath, '/homepage_url');
      assert.equal(validate.errors[0].message, 'should match format "uri"');
      assert.equal(validate.errors[1].message,
        'should match pattern "^__MSG_.*?__$"');
    });
  }
});
