import { validateAddon, getValidator } from 'schema/validator';

import { getValidatorWithFakeSchema, validManifest } from './helpers';

describe('getValidator', () => {
  it('throws on invalid manifest version range options', () => {
    expect(() => {
      const validator = getValidator({
        minManifestVersion: 3,
        maxManifestVersion: 2,
        // No need to cache this validator instance.
        forceNewValidatorInstance: true,
      });
      // Trigger the validator instance initialization
      // to ensure we hit the error on invalid manifest
      // version range.
      validator._lazyInit();
    }).toThrow(/Invalid manifest version range requested:/);
  });

  it('returns different instances on different options', () => {
    const validatorDefault = getValidator({});
    const validatorMinV2 = getValidator({ minManifestVersion: 2 });
    const validatorMaxV3 = getValidator({ maxManifestVersion: 3 });
    const validatorOnlyV3 = getValidator({
      minManifestVersion: 3,
      maxManifestVersion: 3,
    });

    expect(validatorDefault).not.toBe(validatorMinV2);
    expect(validatorDefault).not.toBe(validatorMaxV3);
    expect(validatorDefault).not.toBe(validatorOnlyV3);
    expect(validatorOnlyV3).not.toBe(validatorMaxV3);
    expect(validatorOnlyV3).not.toBe(validatorMinV2);
  });

  it('returns the same instance for the same options', () => {
    const options = { maxManifestVersion: 3 };
    const validator = getValidator(options);
    const validator2 = getValidator({ maxManifestVersion: 3 });
    const validator3 = getValidator(options);
    expect(validator).toBe(validator2);
    expect(validator).toBe(validator3);

    const validatorEmpty = getValidator();
    const validatorDefault = getValidator({});
    expect(validatorEmpty).toBe(validatorDefault);
  });

  it('can be forced to not cache an instance', () => {
    const options = { minManifestVersion: 3, maxManifestVersion: 3 };
    const validator = getValidator(options);
    const validator2 = getValidator(options);

    options.forceNewValidatorInstance = true;
    const validator3 = getValidator(options);
    const validator4 = getValidator(options);

    expect(validator).toBe(validator2);
    expect(validator).not.toBe(validator3);
    expect(validator).not.toBe(validator4);
    expect(validator3).not.toBe(validator4);
  });
});

describe('Schema JSON', () => {
  it('should be valid against the reference schema', () => {
    const isValid = validateAddon(validManifest);
    expect(isValid).toBeTruthy();
  });

  describe('min/max_manifest_version', () => {
    it('does report a validation error on min_manifest_version', () => {
      // Create a validator with custom fake schema that
      // contains an `action` manifest property only supported
      // for manifest_version 3 extensions.
      const validator = getValidatorWithFakeSchema({
        maxManifestVersion: 3,
        apiSchemas: {
          action: {
            $id: 'action',
            definitions: {
              WebExtensionManifest: {
                properties: {
                  action: {
                    type: 'object',
                    min_manifest_version: 3,
                  },
                },
              },
            },
          },
        },
      });

      const isValidMV2 = validator.validateAddon({
        ...validManifest,
        // Add properties that are expected to be triggering
        // validation errors because unsupported with manifest_version 2.
        manifest_version: 2,
        action: {},
      });

      expect(validator.validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/action',
            keyword: 'min_manifest_version',
            params: { min_manifest_version: 3 },
          }),
        ])
      );
      expect(isValidMV2).toBe(false);

      // Expect the manifest to be valid with manifest_version 3
      const isValidMV3 = validator.validateAddon({
        ...validManifest,
        manifest_version: 3,
        action: {},
      });

      expect(validator.validateAddon.errors).toEqual(null);
      expect(isValidMV3).toBe(true);
    });

    it('does report a validation error on max_manifest_version', () => {
      // Create a validator with custom fake schema that
      // contains a `page_action` manifest property only supported
      // for manifest_version 2 extensions
      const validator = getValidatorWithFakeSchema({
        maxManifestVersion: 3,
        apiSchemas: {
          page_action: {
            $id: 'page_action',
            definitions: {
              WebExtensionManifest: {
                properties: {
                  page_action: {
                    max_manifest_version: 2,
                    type: 'object',
                  },
                },
              },
            },
          },
        },
      });

      const isValidMV2 = validator.validateAddon({
        ...validManifest,
        // Add properties that are expected to be valid
        // with manifest_version 2.
        manifest_version: 2,
        page_action: {},
      });
      expect(validator.validateAddon.errors).toEqual(null);
      expect(isValidMV2).toBe(true);

      const isValidMV3 = validator.validateAddon({
        ...validManifest,
        // Add properties that are expected to be triggering
        // validation errors because unsupported with manifest_version 3.
        manifest_version: 3,
        page_action: {},
      });

      expect(validator.validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/page_action',
            keyword: 'max_manifest_version',
            params: { max_manifest_version: 2 },
          }),
        ])
      );
      expect(isValidMV3).toBe(false);
    });
  });
});
