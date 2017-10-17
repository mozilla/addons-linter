import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import schemaList from 'schema/imported';

const schemaArrayNames = ['functions', 'events'];
const schemaObjectNames = ['types', 'properties'];
const schemas = schemaList.reduce((all, current) => ({
  ...all,
  [current.id]: current,
}), {});

export function isDeprecatedApi(namespace, property) {
  return DEPRECATED_APIS.includes(`${namespace}.${property}`);
}

export function isTemporaryApi(namespace, property) {
  return TEMPORARY_APIS.includes(`${namespace}.${property}`);
}

function hasObjectProperty(schema, property) {
  return schemaObjectNames.some((schemaProperty) => {
    return schema[schemaProperty] && property in schema[schemaProperty];
  });
}

function hasArrayProperty(schema, property) {
  return schemaArrayNames.some((schemaProperty) => {
    const namespaceProperties = schema[schemaProperty];
    return Array.isArray(namespaceProperties) &&
      namespaceProperties.some((schemaItem) => {
        return schemaItem.name === property;
      });
  });
}

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
  return hasObjectProperty(schema, property)
    || hasArrayProperty(schema, property);
}

function insertPermissions(permissionsNeeded, schema) {
  if (schema) {
    for (let i = 0; i < schema.length; i++) {
      permissionsNeeded.push(schema[i]);
    }
  }
}

export function permissionNeeded(namespace, property) {
  const permissionsNeeded = [];
  if (schemas[namespace]) {
    let schema = schemas[namespace].permissions;
    const schemaProperty = schemas[namespace].functions;
    insertPermissions(permissionsNeeded, schema);
    if (schemaProperty) {
      for (let i = 0; i < schemaProperty.length; i++) {
        if (schemaProperty[i].name === property) {
          schema = schemaProperty[i].permissions;
          insertPermissions(permissionsNeeded, schema);
        }
      }
    }
  }
  return permissionsNeeded;
}
