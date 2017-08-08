import cloneDeep from 'lodash.clonedeep';

import validate from 'schema/validator';

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
    validate(manifest);
    expect(validate.errors).toBeNull();
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
    validate(manifest);
    expect(validate.errors).toBeNull();
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
    validate(manifest);
    assertHasMatchingError(validate.errors, {
      dataPath: '/content_scripts/0/run_at',
      message: 'should be equal to one of the allowed values',
    });
  });
});
