const FLAG_PATTERN_REGEX = /^\(\?[im]*\)(.*)/;

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

export function rewriteKey(key) {
  if (key === 'choices') {
    return 'anyOf';
  }
  return key;
}

export function rewriteRefs(schema) {
  return Object.keys(schema).reduce((obj, key) => {
    const value = rewriteRef(key, schema[key]);
    if (value === undefined) {
      return obj;
    }
    return { ...obj, [rewriteKey(key)]: value };
  }, {});
}

export function mapExtendToRef(schemas) {
  const updatedSchemas = { ...schemas };
  Object.keys(updatedSchemas).forEach((id) => {
    const { schema } = updatedSchemas[id];
    Object.keys(schema.refs).forEach((ref) => {
      const { namespace, type } = schema.refs[ref];
      const extendSchema = updatedSchemas[namespace].schema;
      const extendType = extendSchema.types[type];
      let updatedType;
      if ('anyOf' in extendType) {
        updatedType = {
          ...extendType,
          anyOf: [...extendType.anyOf, { $ref: ref }],
        };
      } else if (!('allOf' in extendType)) {
        updatedType = { allOf: [extendType, { $ref: ref }] };
      } else {
        updatedType = {
          ...extendType,
          allOf: [...extendType.allOf, { $ref: ref }],
        };
      }
      if (updatedType) {
        updatedSchemas[namespace] = {
          ...updatedSchemas[namespace],
          schema: {
            ...extendSchema,
            types: {
              ...extendSchema.types,
              [type]: updatedType,
            },
          },
        };
      }
    });
  });
  return updatedSchemas;
}

export function loadTypes(types) {
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

export function normalizeSchema(schemas) {
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

export function loadSchema(schema) {
  const { id, ...rest } = inner.normalizeSchema(schema);
  const newSchema = { id, ...inner.rewriteRefs(rest) };
  if (id === 'manifest') {
    newSchema.$ref = '#/types/WebExtensionManifest';
  }
  return newSchema;
}

export function processSchemas(schemas) {
  const loadedSchemas = {};
  schemas.forEach(({ file, schema }) => {
    // Convert the Firefox schema to more standard JSON schema.
    const loadedSchema = inner.loadSchema(schema);
    loadedSchemas[loadedSchema.id] = { file, schema: loadedSchema };
  });
  // Now that everything is loaded, we can finish mapping the non-standard
  // $extend to $ref.
  return inner.mapExtendToRef(loadedSchemas);
}

export const inner = {
  normalizeSchema, rewriteRefs, loadSchema, mapExtendToRef,
};
