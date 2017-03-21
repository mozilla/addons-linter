import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import schemaList from 'schema/firefox-schemas';

const schemaArrayNames = ['functions', 'events'];
const schemaObjectNames = ['types', 'properties'];
const schemas = schemaList.reduce((all, current) => ({
  ...all,
  [current.id]: current,
}), {});

export function hasBrowserApi(namespace, property) {
  const schema = schemas[namespace];
  // We "have" the API if it's deprecated or temporary so
  // we don't double warn.
  if (isDeprecatedApi(namespace, property)
    || isTemporaryApi(namespace, property)) {
    return true;
  }
  if (!schema) {
    return false;
  }
  return schemaObjectNames.some((schemaProperty) => {
    return schema[schemaProperty] && property in schema[schemaProperty];
  }) || schemaArrayNames.some((schemaProperty) => {
    const namespaceProperties = schema[schemaProperty];
    return Array.isArray(namespaceProperties) &&
      namespaceProperties.some((schemaItem) => {
        return schemaItem.name === property;
      });
  });
}

export function isDeprecatedApi(namespace, property) {
  return DEPRECATED_APIS.includes(`${namespace}.${property}`);
}

export function isTemporaryApi(namespace, property) {
  return TEMPORARY_APIS.includes(`${namespace}.${property}`);
}
