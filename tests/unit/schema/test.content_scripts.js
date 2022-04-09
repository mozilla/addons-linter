import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/content_scripts', () => {
  it('supports simple content scripts', () => {
    const manifest = cloneDeep(validManifest);
    manifest.content_scripts = [
      {
        matches: ['*://*.mozilla.org/*'],
        js: ['borderify.js'],
      },
    ];
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('supports run_at', () => {
    const manifest = cloneDeep(validManifest);
    manifest.content_scripts = [
      {
        matches: ['*://*.mozilla.org/*'],
        js: ['borderify.js'],
        run_at: 'document_start',
      },
    ];
    validateAddon(manifest);
    expect(validateAddon.errors).toBeNull();
  });

  it('catches invalid run_at', () => {
    const manifest = cloneDeep(validManifest);
    manifest.content_scripts = [
      {
        matches: ['*://*.mozilla.org/*'],
        js: ['borderify.js'],
        run_at: 'whenever',
      },
    ];
    validateAddon(manifest);
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/content_scripts/0/run_at',
      message: 'must be equal to one of the allowed values',
    });
  });
});
