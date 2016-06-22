import validate from 'schema/validator';
import { validManifest } from './helpers';


describe('Schema JSON', () => {

  it('should be valid against the reference schema', () => {
    var isValid = validate(validManifest);
    assert.ok(isValid);
  });

});
