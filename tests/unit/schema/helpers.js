import cloneDeep from 'lodash.clonedeep';

import { getValidator } from 'schema/validator';

export const validManifest = {
  manifest_version: 2,
  name: 'test-manifest',
  version: '1.0',
  applications: {
    gecko: {
      id: 'test-manifest@mozilla.org',
    },
  },
};

export function createValidManifest(overriddenProps) {
  // Return a deep clone to avoid that changes to the manifest object returned could
  // change the subproperties nested into the validManifest const or the object passed
  // to overrideProps (and as a side-effect trigger unexpected test failures).
  return cloneDeep({
    ...validManifest,
    ...overriddenProps,
  });
}

/**
 * Create a fake manifest.json schema (in the same format used by
 * src/schema/imported/manifest.json), optionally customized based
 * on the given paramaters.
 *
 * @param {object} options
 * @param {object} options.manifestBaseProperties
 *   An object merged into `ManifestBase.properties` to allow tests
 *   to customize the base manifest properties (e.g. to change the
 *   schema for the `manifest_version` property).
 * @param {object} options.apiSchemas
 *   A map of API namespaces schema data that is expected to
 *   include a `definitions.WebExtensionManifest` property:
 *
 *      {
 *        page_action: {
 *          $id: "page_action",
 *          definitions: {
 *            WebExtensionManifest: { ... }
 *          },
 *        },
 *      }
 *
 *   (look to src/schema/imported data, e.g. manifest.json and
 *   page_action.json for examples of an api namespace extending
 *   the manifest properties through their api specific definitions).
 * @param {boolean} options.forceNewValidatorInstance
 *   Set to false to cache the validator instance.
 * @param {number} options.minManifestVersion
 *   Change the minimum manifest version allowed by the validator
 *   instance.
 * @param {number} options.maxManifestVersion
 *   Change the maximum manifest version allowed by the validator
 *   instance.
 *
 * @returns object
 *   Returns the generated fake manifest.json data.
 */
export function getValidatorWithFakeSchema({
  apiSchemas = {},
  manifestBaseProperties = {},
  forceNewValidatorInstance = true,
  minManifestVersion,
  maxManifestVersion,
} = {}) {
  const fakeManifestBase = {
    type: 'object',
    required: ['manifest_version'],
    properties: {
      manifest_version: {
        type: 'integer',
        minimum: 2,
        maximum: 2,
      },
      ...manifestBaseProperties,
    },
  };

  const apiManifestAdditions = Object.values(apiSchemas)
    .filter((schema) => {
      // We are only interested in the api Schemas
      return !!schema.definitions?.WebExtensionManifest;
    })
    .map(({ $id }) => {
      return { $ref: `${$id}#/definitions/WebExtensionManifest` };
    });

  const fakeWebExtensionManifest = {
    allOf: [
      {
        $merge: {
          source: {
            $ref: 'manifest#/types/ManifestBase',
          },
          with: {
            type: 'object',
          },
        },
      },
      ...apiManifestAdditions,
    ],
  };

  return getValidator({
    forceNewValidatorInstance,
    minManifestVersion,
    maxManifestVersion,
    schemas: apiSchemas,
    schemaObject: {
      $id: 'manifest',
      refs: {},
      types: {
        ExtensionURL: {
          type: 'string',
        },
        ManifestBase: fakeManifestBase,
        WebExtensionManifest: fakeWebExtensionManifest,
      },
    },
  });
}
