import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';
import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/commands', () => {
  it('should be valid with a default', () => {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      all: { suggested_key: { default: 'Ctrl+Shift+A' } },
    };
    validate(manifest);
    assert.notOk(validate.errors);
  });

  it('should allow unknown platforms', () => {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      all: { suggested_key: { notAPlatform: 'Modifier+9' } },
    };
    validate(manifest);
    assert.notOk(validate.errors);
  });

  it('should validate the key string', function() {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      up: { suggested_key: { mac: 'Command+ShiftUp' } },
    };
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/commands/up/suggested_key/mac',
      message: /should match pattern/,
    });
  });
});
