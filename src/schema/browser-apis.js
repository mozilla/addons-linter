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
  return schemaObjectNames.some((schemaProperty) => {
    if (schema[schemaProperty] && property in schema[schemaProperty]) {
      return schema[schemaProperty][property];
    }
    return false;
  });
}

function getArrayProperty(schema, property) {
  return schemaArrayNames.some((schemaProperty) => {
    const namespaceProperties = schema[schemaProperty];
    return (
      Array.isArray(namespaceProperties) &&
      namespaceProperties.some((schemaItem) => {
        if (schemaItem.name === property) {
          return schemaItem;
        }
        return false;
      })
    );
  });
}

export function isTemporaryApi(namespace, property) {
  return TEMPORARY_APIS.includes(`${namespace}.${property}`);
}

export function isDeprecatedApi(namespace, property) {
  const schema = schemas[namespace];
  let schemaItem = getObjectProperty(schema, property);

  if (!schemaItem) {
    schemaItem = getArrayProperty(schema, property);
  }

  console.log('sss', schemaItem);
  return (
    schemaItem.deprecated !== undefined &&
    DEPRECATED_JAVASCRIPT_APIS.includes(`${namespace}.${property}`)
  );
}

export function hasBrowserApi(namespace, property) {
  const schema = schemas[namespace];
  if (
    isTemporaryApi(namespace, property) ||
    isDeprecatedApi(namespace, property)
  ) {
    return true;
  }
  if (!schema) {
    return false;
  }
  return (
    getObjectProperty(schema, property) || getArrayProperty(schema, property)
  );
}
