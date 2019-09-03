import { DEPRECATED_JAVASCRIPT_APIS, TEMPORARY_APIS } from 'const';
import schemaList from 'schema/imported';

const schemaArrayNames = ['functions', 'events'];
const schemaObjectNames = ['types', 'properties'];
const schemas = schemaList.reduce(
  (all, current) => ({
    ...all,
    [current.id]: current,
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

export function isTemporaryApi(namespace, property) {
  return TEMPORARY_APIS.includes(`${namespace}.${property}`);
}

export function isDeprecatedApi(namespace, property) {
  const schema = schemas[namespace];

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

export function hasBrowserApi(namespace, property) {
  const schema = schemas[namespace];
  // We "have" the API if it's deprecated or temporary so we don't double warn.
  if (
    isTemporaryApi(namespace, property) ||
    isDeprecatedApi(namespace, property)
  ) {
    return true;
  }

  const schemaItem =
    getObjectProperty(schema, property) || getArrayProperty(schema, property);

  return schemaItem && !schemaItem.unsupported;
}
