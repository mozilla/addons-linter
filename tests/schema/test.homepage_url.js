import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('/homepage_url', () => {

  const validURLs = [
    'https://example.com/some/page',
    'http://foo.com',
  ];

  for (let validURL of validURLs) {
    it(`${validURL} should be valid`, () => {
      var manifest = cloneDeep(validManifest);
      manifest.homepage_url = validURL;
      validate(manifest);
      assert.isNull(validate.errors);
    });
  }

  it('not a URI should be invalid', () => {
    var manifest = cloneDeep(validManifest);
    manifest.homepage_url = 'wat';
    validate(manifest);
    assert.equal(validate.errors.length, 1);
    assert.equal(validate.errors[0].dataPath, '/homepage_url');
    assert.equal(validate.errors[0].message, 'should match format "uri"');
  });

});
