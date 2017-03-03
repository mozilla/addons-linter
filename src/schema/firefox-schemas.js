import deepExtend from 'deep-extend';

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

function isUnrecognizedProperty(value) {
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length === 1 &&
      '$ref' in value &&
      value.$ref === 'UnrecognizedProperty';
  }
  return false;
}

export function rewriteValue(key, value) {
  if (Array.isArray(value)) {
    return value.map((val) => rewriteValue(key, val));
  } else if (key === 'additionalProperties' &&
      isUnrecognizedProperty(value)) {
    return undefined;
  } else if (typeof value === 'object') {
    if ('$ref' in value && Object.keys(value).length > 1) {
      const { $ref, ...rest } = value;
      if (Object.keys(rest).length === 1 && 'optional' in rest) {
        return {
          $ref: rewriteValue('$ref', $ref),
          ...rest,
        };
      }
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
    if (value.includes('#/types')) {
      return value;
    }
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
  const schemas = { ...firefoxSchemas };
  Object.keys(ourSchemas).forEach((namespace) => {
    const firefoxSchema = firefoxSchemas[namespace];
    const ourSchema = ourSchemas[namespace];
    schemas[namespace] = {
      ...firefoxSchema,
      schema: deepExtend(firefoxSchema.schema, ourSchema),
    };
  });
  return schemas;
};

export function loadTypes(types = []) {
  // Convert the array of types to an object.
  return types.reduce((obj, type) => ({
    ...obj,
    [type.id]: type,
  }), {});
}

function rewriteExtendRefs(definition, namespace, types) {
  if (Array.isArray(definition)) {
    return definition.map(
      (value) => rewriteExtendRefs(value, namespace, types));
  } else if (typeof definition === 'object') {
    return Object.keys(definition).reduce((obj, key) => {
      const value = definition[key];
      if (key === '$ref') {
        if (!value.includes('.') && !(value in types)) {
          return { ...obj, [key]: `${namespace}#/types/${value}` };
        }
      }
      return { ...obj, [key]: rewriteExtendRefs(value, namespace, types) };
    }, {});
  }
  return definition;
}

export function rewriteExtend(schemas, schemaId) {
  const definitions = {};
  const refs = {};
  const types = {};
  schemas.forEach((extendSchema) => {
    const extendId = extendSchema.namespace;
    const extendDefinitions = {};
    const extendTypes = {};
    extendSchema.types.forEach((type) => {
      const { $extend, id, ...rest } = type;
      if ($extend) {
        // Move the $extend into definitions.
        extendDefinitions[$extend] = rest;
        // Remember the location of this file so we can $ref it later.
        refs[`${schemaId}#/definitions/${$extend}`] = {
          namespace: extendId,
          type: $extend,
        };
      } else if (id) {
        // Move this type into types.
        extendTypes[id] = rest;
        types[id] = rest;
      } else {
        throw new Error('cannot handle extend, $extend or id is required');
      }
    });
    Object.keys(extendDefinitions).forEach((id) => {
      // Update $refs to point to the right namespace.
      const definition = extendDefinitions[id];
      definitions[id] = rewriteExtendRefs(definition, extendId, extendTypes);
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
