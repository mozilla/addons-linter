import cloneDeep from 'lodash.clonedeep';

import { SCHEMA_KEYWORDS } from 'const';
import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/experiment_apis', () => {
  it('should be reported as privileged property', () => {
    const manifest = cloneDeep(validManifest);
    manifest.experiment_apis = {
      myExperimentalAPI: {
        schema: 'api/schema.json',
        parent: {
          scopes: ['addon_parent'],
          paths: [['myExperimentalAPI']],
          script: 'api/api.js',
        },
      },
    };

    validateAddon(manifest);

    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: SCHEMA_KEYWORDS.PRIVILEGED,
          instancePath: '/experiment_apis',
        }),
      ])
    );
  });
});

describe('/builtin_widget', () => {
  it('should be reported as privileged property', () => {
    const manifest = cloneDeep(validManifest);
    manifest.builtin_widget = {
      page: 'widget.html',
      sizes: ['small', 'medium'],
      default_size: 'small',
      pref_branch: 'extensions.widgets.test',
    };

    validateAddon(manifest);

    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: SCHEMA_KEYWORDS.PRIVILEGED,
          instancePath: '/builtin_widget',
        }),
      ])
    );
  });
});

describe('/l10n_resources', () => {
  it('should be reported as privileged property', () => {
    const manifest = cloneDeep(validManifest);
    manifest.l10n_resources = [];

    validateAddon(manifest);

    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: SCHEMA_KEYWORDS.PRIVILEGED,
          instancePath: '/l10n_resources',
        }),
      ])
    );
  });
});

describe('/permissions', () => {
  it.each(['mozillaAddons', 'telemetry', 'networkStatus'])(
    'should report "%s" as a privileged permission',
    (privilegedPerm) => {
      const manifest = cloneDeep(validManifest);
      manifest.permissions = ['fakeUnknownPerm', privilegedPerm, 'tabs'];

      validateAddon(manifest);

      expect(validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/permissions',
            keyword: SCHEMA_KEYWORDS.VALIDATE_PRIVILEGED_PERMISSIONS,
            params: expect.objectContaining({
              privilegedPermissions: [privilegedPerm],
            }),
          }),
        ])
      );
    }
  );
});
