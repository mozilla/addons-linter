import fs from 'fs';

import commentJson from 'comment-json';

const SKIP_SCHEMAS = [
  'native_host_manifest.json',
];
const FLAG_PATTERN_REGEX = /^\(\?[im]*\)(.*)/;

function loadTypes(types) {
  // Convert the array of types to an object.
  return types.reduce((obj, type) => ({
    ...obj,
    [type.id]: type,
  }), {});
}

function rewriteExtend(schemas, schemaId) {
  const definitions = {};
  const refs = {};
  schemas.forEach((extendSchema) => {
    const extendId = extendSchema.namespace;
    extendSchema.types.forEach((type) => {
      const { $extend, ...rest } = type;
      // Move the $extend into definitions.
      definitions[$extend] = rest;
      // Remember the location of this file so we can $ref it later.
      refs[`${schemaId}#/definitions/${$extend}`] = {
        namespace: extendId,
        type: $extend,
      };
    });
  });
  return { definitions, refs };
}

function normalizeSchema(schemas) {
  let extendSchemas;
  let primarySchema;

  if (schemas.length === 1) {
    primarySchema = schemas[0];
    extendSchemas = [];
  } else {
    extendSchemas = schemas.slice(0, schemas.length - 1);
    primarySchema = schemas[schemas.length - 1];
  }
  const { namespace, types, ...rest } = primarySchema;
  return {
    ...rest,
    ...rewriteExtend(extendSchemas, namespace),
    id: namespace,
    types: loadTypes(types),
  };
}

function stripFlagsFromPattern(value) {
  // TODO: Fix these patterns and remove this code.
  const matches = FLAG_PATTERN_REGEX.exec(value);
  if (matches) {
    return matches[1];
  }
  return value;
}

/*
 * Convert the absence of `optional` or `optional: false` to an array of
 * required properties at the same level of the properties (more processing
 * is done in rewriteRef).
 */
export function rewriteOptionalToRequired(schema) {
  const required = [];
  const withoutOptional = Object.keys(schema).reduce((obj, key) => {
    const value = schema[key];
    if (!Array.isArray(value) && typeof value === 'object') {
      const { optional, ...rest } = value;
      if (!optional) {
        required.push(key);
      }
      return { ...obj, [key]: rest };
    }
    return { ...obj, [key]: value };
  }, {});
  return { ...withoutOptional, required };
}

export function rewriteRef(key, value) {
  if (Array.isArray(value)) {
    return value.map((val) => rewriteRef(key, val));
  } else if (typeof value === 'object') {
    const rewritten = rewriteRefs(value);
    if ('properties' in rewritten) {
      const { required, ...properties } = rewriteOptionalToRequired(
        rewritten.properties);
      if (required.length > 0) {
        return { ...rewritten, properties, required };
      }
      return { ...rewritten, properties };
    }
    return rewritten;
  } else if (key === '$ref') {
    let path = value;
    let schemaId = '';
    if (value.includes('.')) {
      [schemaId, path] = value.split('.', 2);
    }
    return `${schemaId}#/types/${path}`;
  } else if (key === 'type' && value === 'any') {
    return undefined;
  } else if (key === 'id') {
    return undefined;
  } else if (key === 'pattern') {
    return stripFlagsFromPattern(value);
  }
  return value;
}

function rewriteKey(key) {
  if (key === 'choices') {
    return 'anyOf';
  }
  return key;
}

function rewriteRefs(schema) {
  return Object.keys(schema).reduce((obj, key) => {
    const value = rewriteRef(key, schema[key]);
    if (value === undefined) {
      return obj;
    }
    return { ...obj, [rewriteKey(key)]: value };
  }, {});
}

function loadSchema(schema) {
  const { id, ...rest } = normalizeSchema(schema);
  const newSchema = { id, ...rewriteRefs(rest) };
  if (id === 'manifest') {
    newSchema.$ref = '#/types/WebExtensionManifest';
  }
  return newSchema;
}

function readSchema(path, file) {
  return commentJson.parse(
    fs.readFileSync(`${path}/${file}`, 'utf-8'),
    null, // reviver
    true, // remove_comments
  );
}

function writeSchema(path, file, schema) {
  fs.writeFile(`${path}/${file}`, JSON.stringify(schema, undefined, 2));
}

function schemaFiles(path) {
  return fs.readdirSync(path);
}

function loadSchemasFromFile(path) {
  const loadedSchemas = {};
  // Read the schemas into loadedSchemas.
  schemaFiles(path).forEach((file) => {
    if (SKIP_SCHEMAS.includes(file)) {
      return;
    }
    const schema = loadSchema(readSchema(path, file));
    loadedSchemas[schema.id] = {
      file,
      schema,
    };
  });
  return loadedSchemas;
}

function writeSchemasToFile(path, loadedSchemas) {
  // Write out the schemas.
  Object.keys(loadedSchemas).forEach((id) => {
    const { file, schema } = loadedSchemas[id];
    writeSchema(`${path}/../imported`, file, schema);
  });
}

export function importSchemas() {
  const path = process.argv[2];
  const loadedSchemas = loadSchemasFromFile(path);
  // Map $extend to $ref.
  Object.keys(loadedSchemas).forEach((id) => {
    const { schema } = loadedSchemas[id];
    Object.keys(schema.refs).forEach((ref) => {
      const { namespace, type } = schema.refs[ref];
      const extendSchema = loadedSchemas[namespace].schema;
      const extendType = extendSchema.types[type];
      if ('anyOf' in extendType) {
        extendType.anyOf.push({ $ref: ref });
      } else {
        if (!('allOf' in extendType)) {
          extendSchema.types[type] = { allOf: [extendType] };
        }
        extendSchema.types[type].allOf.push({ $ref: ref });
      }
    });
  });
  writeSchemasToFile(path, loadedSchemas);
}
