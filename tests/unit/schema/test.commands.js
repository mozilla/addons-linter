import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/commands', () => {
  it('should be valid with a default', () => {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      all: { suggested_key: { default: 'Ctrl+Shift+A' } },
    };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeFalsy();
  });

  it('should allow unknown platforms', () => {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      all: { suggested_key: { notAPlatform: 'Modifier+9' } },
    };
    validateAddon(manifest);
    expect(validateAddon.errors).toBeFalsy();
  });

  it('should validateAddon the key string', () => {
    const manifest = cloneDeep(validManifest);
    manifest.commands = {
      up: { suggested_key: { mac: 'Command+ShiftUp' } },
    };
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/commands/up/suggested_key/mac',
      message: 'must match format "manifestShortcutKey"',
    });
  });
});
