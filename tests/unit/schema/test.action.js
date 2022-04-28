import { validateAddon } from 'schema/validator';

import { createValidManifest } from './helpers';
import { assertHasMatchingError } from '../helpers';

describe('/browser_action', () => {
  it('should be allowed in manifest_version 2', () => {
    validateAddon(
      createValidManifest({
        manifest_version: 2,
        browser_action: { default_popup: 'popup.html' },
      })
    );
    expect(validateAddon.errors).toBe(null);
  });

  it('should not be allowed in manifest_version 3', () => {
    validateAddon(
      createValidManifest({
        manifest_version: 3,
        browser_action: { default_popup: 'popup.html' },
      }),
      { maxManifestVersion: 3 }
    );
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/browser_action',
      keyword: 'max_manifest_version',
      params: { max_manifest_version: 2 },
    });
  });
});

describe('/action', () => {
  it('should be allowed in manifest_version 3', () => {
    validateAddon(
      createValidManifest({
        manifest_version: 3,
        action: { default_popup: 'popup.html' },
      }),
      { maxManifestVersion: 3 }
    );
    expect(validateAddon.errors).toBe(null);
  });

  it('should not be allowed in manifest_version 2', () => {
    validateAddon(
      createValidManifest({
        manifest_version: 2,
        action: { default_popup: 'popup.html' },
      })
    );
    assertHasMatchingError(validateAddon.errors, {
      instancePath: '/action',
      keyword: 'min_manifest_version',
      params: { min_manifest_version: 3 },
    });
  });
});
