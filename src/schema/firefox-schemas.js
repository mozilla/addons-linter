const FLAG_PATTERN_REGEX = /^\(\?[im]*\)(.*)/;

// Reference some functions on inner so they can be stubbed in tests.
export const inner = {};

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
 * is done in rewriteValue).
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

export function rewriteValue(key, value) {
  if (Array.isArray(value)) {
    return value.map((val) => rewriteValue(key, val));
  } else if (typeof value === 'object') {
    if ('$ref' in value && Object.keys(value).length > 1) {
      const { $ref, ...rest } = value;
      return {
        allOf: [
          { $ref: rewriteValue('$ref', $ref) },
          rewriteValue(key, rest),
        ],
      };
    }
    const rewritten = inner.rewriteObject(value);
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

inner.rewriteObject = (schema) => {
  return Object.keys(schema).reduce((obj, key) => {
    const value = rewriteValue(key, schema[key]);
    if (value === undefined) {
      return obj;
    }
    return { ...obj, [rewriteKey(key)]: value };
  }, {});
};

inner.mapExtendToRef = (schemas) => {
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
};

inner.updateWithAddonsLinterData = (firefoxSchemas, ourSchemas) => {
  
};

export function loadTypes(types = []) {
  // Convert the array of types to an object.
  return types.reduce((obj, type) => ({
    ...obj,
    [type.id]: type,
  }), {});
}

export function rewriteExtend(schemas, schemaId) {
  const definitions = {};
  const refs = {};
  const types = {};
  schemas.forEach((extendSchema) => {
    const extendId = extendSchema.namespace;
    extendSchema.types.forEach((type) => {
      const { $extend, id, ...rest } = type;
      if ($extend) {
        // Move the $extend into definitions.
        definitions[$extend] = rest;
        // Remember the location of this file so we can $ref it later.
        refs[`${schemaId}#/definitions/${$extend}`] = {
          namespace: extendId,
          type: $extend,
        };
      } else if (id) {
        // Move this type into types.
        types[id] = rest;
      } else {
        throw new Error('cannot handle extend, $extend or id is required');
      }
    });
  });
  return { definitions, refs, types };
}

inner.normalizeSchema = (schemas) => {
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
  const { types: extendTypes, ...extendRest } = rewriteExtend(
      extendSchemas, namespace);
  const updatedTypes = { ...loadTypes(types), ...extendTypes };
  return {
    ...rest,
    ...extendRest,
    id: namespace,
    types: updatedTypes,
  };
};

inner.loadSchema = (schema) => {
  const { id, ...rest } = inner.normalizeSchema(schema);
  const newSchema = { id, ...inner.rewriteObject(rest) };
  if (id === 'manifest') {
    newSchema.$ref = '#/types/WebExtensionManifest';
  }
  return newSchema;
};

export function processSchemas(schemas, ourSchemas) {
  const loadedSchemas = {};
  schemas.forEach(({ file, schema }) => {
    // Convert the Firefox schema to more standard JSON schema.
    const loadedSchema = inner.loadSchema(schema);
    loadedSchemas[loadedSchema.id] = { file, schema: loadedSchema };
  });
  // Now that everything is loaded, we can finish mapping the non-standard
  // $extend to $ref.
  const extendedSchemas = inner.mapExtendToRef(loadedSchemas);
  // Update the Firefox schemas with some missing validations, defaults and descriptions.
  return inner.updateWithAddonsLinterData(extendedSchemas, ourSchemas);
}
