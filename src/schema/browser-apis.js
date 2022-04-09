import {
  DEPRECATED_JAVASCRIPT_APIS,
  TEMPORARY_APIS,
  MANIFEST_VERSION_DEFAULT,
  MANIFEST_VERSION_MIN,
  MANIFEST_VERSION_MAX,
} from 'const';
import schemaList from 'schema/imported';

const schemaArrayNames = ['functions', 'events'];
const schemaObjectNames = ['types', 'properties'];
const schemas = schemaList.reduce(
  (all, current) => ({
    ...all,
    [current.$id]: current,
  }),
  {}
);

function getObjectProperty(schema, property) {
  for (const schemaProperty of schemaObjectNames) {
    if (
      schema &&
      schema[schemaProperty] &&
      property in schema[schemaProperty]
    ) {
      return schema[schemaProperty][property];
    }
  }
  return null;
}

function getArrayProperty(schema, property) {
  for (const schemaProperty of schemaArrayNames) {
    if (schema && schemaProperty in schema) {
      const namespaceProperties = schema[schemaProperty];
      if (Array.isArray(namespaceProperties)) {
        for (const schemaItem of namespaceProperties) {
          if (schemaItem.name === property) {
            return schemaItem;
          }
        }
      }
    }
  }
  return null;
}

export function getManifestVersion(addonMetadata) {
  const { manifestVersion } = addonMetadata || {
    manifestVersion: MANIFEST_VERSION_DEFAULT,
  };
  return manifestVersion;
}

export function getMaxManifestVersion(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  const schema = apiSchemas[namespace];
  const schemaItem =
    getObjectProperty(schema, property) || getArrayProperty(schema, property);

  let ns_max_mv = schema && schema.max_manifest_version;
  ns_max_mv = ns_max_mv == null ? MANIFEST_VERSION_MAX : ns_max_mv;

  let prop_max_mv = schemaItem && schemaItem.max_manifest_version;
  prop_max_mv = prop_max_mv == null ? MANIFEST_VERSION_MAX : prop_max_mv;

  // Return the lowest max_manifest_version value between the one set at
  // API namespace level and the one set on the particular property.
  return Math.min(ns_max_mv, prop_max_mv);
}

export function getMinManifestVersion(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  const schema = apiSchemas[namespace];
  const schemaItem =
    getObjectProperty(schema, property) || getArrayProperty(schema, property);

  let ns_min_mv = schema && schema.min_manifest_version;
  ns_min_mv = ns_min_mv == null ? MANIFEST_VERSION_MIN : ns_min_mv;

  let prop_min_mv = schemaItem && schemaItem.min_manifest_version;
  prop_min_mv = prop_min_mv == null ? MANIFEST_VERSION_MIN : prop_min_mv;

  // Return the highest min_manifest_version value between the one set at
  // API namespace level and the one set on the particular property.
  return Math.max(ns_min_mv, prop_min_mv);
}

export function isTemporaryApi(namespace, property) {
  return TEMPORARY_APIS.includes(`${namespace}.${property}`);
}

export function isMV2RemovedApi(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  // The message for API deprecated in manifest_version 3 should not be
  // used if the currently validated addon has manifest_version 2.
  if (addonMetadata.manifestVersion === 2) {
    return false;
  }

  return (
    getMaxManifestVersion(namespace, property, addonMetadata, apiSchemas) === 2
  );
}

export function isInSupportedManifestVersionRange(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  const manifestVersion = getManifestVersion(addonMetadata);
  const min_manifest_version = getMinManifestVersion(
    namespace,
    property,
    addonMetadata,
    apiSchemas
  );
  const max_manifest_version = getMaxManifestVersion(
    namespace,
    property,
    addonMetadata,
    apiSchemas
  );

  // The API isn't in a supported manifest version range if its schema entry has a
  // min_manifest_version greater than the extension manifest version or a
  // max_manifest_version lower than the extension manifest version.
  if (
    manifestVersion < min_manifest_version ||
    manifestVersion > max_manifest_version
  ) {
    return false;
  }

  return true;
}

export function isDeprecatedApi(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  // If the API has been removed in a certain manifest version, or only
  // available starting from a manifest version, then it is unsupported
  // and not deprecated.
  if (
    !isInSupportedManifestVersionRange(
      namespace,
      property,
      addonMetadata,
      apiSchemas
    )
  ) {
    return false;
  }

  const schema = apiSchemas[namespace];
  const schemaItem =
    getObjectProperty(schema, property) || getArrayProperty(schema, property);

  return (
    (schemaItem !== null && schemaItem.deprecated !== undefined) ||
    Object.prototype.hasOwnProperty.call(
      DEPRECATED_JAVASCRIPT_APIS,
      `${namespace}.${property}`
    )
  );
}

export function hasBrowserApi(
  namespace,
  property,
  addonMetadata,
  apiSchemas = schemas
) {
  // We "have" the API if it's deprecated or temporary so we don't double warn.
  if (
    isTemporaryApi(namespace, property) ||
    isDeprecatedApi(namespace, property, addonMetadata, apiSchemas)
  ) {
    return true;
  }

  // We don't have the API if the extension manifest_version is outside of the
  // manifest_version range where the API is actually supported for.
  if (
    !isInSupportedManifestVersionRange(
      namespace,
      property,
      addonMetadata,
      apiSchemas
    )
  ) {
    return false;
  }

  // Or the schema entry for the API has an unsupported property set to true.
  const schema = apiSchemas[namespace];
  const schemaItem =
    getObjectProperty(schema, property) || getArrayProperty(schema, property);

  return schemaItem && !schemaItem.unsupported;
}
