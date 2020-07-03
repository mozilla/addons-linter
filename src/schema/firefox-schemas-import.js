import fs from 'fs';
import path from 'path';
import util from 'util';

/* eslint-disable import/no-extraneous-dependencies */
import commentJson from 'comment-json';
import yauzl from 'yauzl';

/* eslint-enable import/no-extraneous-dependencies */

import { deepmerge, deepPatch } from './deepmerge';

const FLAG_PATTERN_REGEX = /^\(\?[im]*\)(.*)/;
/* There are some patterns in the Firefox schemas that have case insensitive
 * flags set. These are marked with (?i) at the beginning of them. The JSON
 * Schema spec does not support flags so this object defines rewritten versions
 * of patterns without the flags. Since these need to be managed by hand, the
 * code that detects a flag in a pattern will throw if there is no rewritten
 * pattern for it, preventing updates to the schemas until it is fixed. */
/* eslint-disable max-len */
export const FLAG_PATTERN_REWRITES = {
  // Extension ID, UUID format.
  '(?i)^\\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\}$':
    '^\\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\}$',
  // Extension ID, email format.
  '(?i)^[a-z0-9-._]*@[a-z0-9-._]+$': '^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$',
};
/* eslint-enable max-len */
const UNRECOGNIZED_PROPERTY_REFS = [
  'UnrecognizedProperty',
  'manifest#/types/UnrecognizedProperty',
];

const schemaRegexes = [
  new RegExp('browser/components/extensions/schemas/.*\\.json'),
  new RegExp('toolkit/components/extensions/schemas/.*\\.json'),
  new RegExp('mail/components/extensions/schemas/.*\\.json'),
];

export const refMap = {
  ExtensionURL: 'manifest#/types/ExtensionURL',
  HttpURL: 'manifest#/types/HttpURL',
  ImageDataOrExtensionURL: 'manifest#/types/ImageDataOrExtensionURL',
};

// Reference some functions on inner so they can be stubbed in tests.
export const inner = {};

// Consider moving this to a Set if you add more schema namespaces.
// Some schemas aren't actually exposed to add-ons, or are for internal
// use in Firefox only. We shouldn't import these schemas.
export const ignoredSchemas = ['omnibox_internal'];

function rewritePatternFlags(value) {
  if (FLAG_PATTERN_REGEX.test(value)) {
    const rewritten = FLAG_PATTERN_REWRITES[value];
    if (!rewritten) {
      throw new Error(`pattern ${value} must be rewritten`);
    }
    return rewritten;
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
      // If there is an allOf, check the inner schemas for optional.
      if (Array.isArray(rest.allOf)) {
        let someOptional = false;
        // Update the inner schemas to remove the optional property and record
        // if we found any optional schemas. See issue #1245.
        // eslint-disable-next-line no-shadow
        rest.allOf = rest.allOf.map((inner) => {
          const { optional: innerOptional, ...innerRest } = inner;
          someOptional = someOptional || innerOptional;
          return innerRest;
        });
        // If none of the inner schemas are optional then this property is required.
        if (!someOptional) {
          required.push(key);
        }
      } else if (!optional) {
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
    return (
      keys.length === 1 &&
      '$ref' in value &&
      UNRECOGNIZED_PROPERTY_REFS.includes(value.$ref)
    );
  }
  return false;
}

function rewriteIdRef(value, namespace = '') {
  let _path = value;
  let schemaId = namespace;
  if (value.includes('.')) {
    [schemaId, _path] = value.split('.', 2);
  }
  return `${schemaId}#/types/${_path}`;
}

export function rewriteValue(key, value, namespace) {
  if (Array.isArray(value)) {
    return value.map((val) => rewriteValue(key, val, namespace));
  }
  if (key === 'additionalProperties' && isUnrecognizedProperty(value)) {
    return undefined;
  }
  if (typeof value === 'object') {
    if ('$ref' in value && Object.keys(value).length > 1) {
      const { $ref, ...rest } = value;
      if (Object.keys(rest).length === 1 && 'optional' in rest) {
        return {
          $ref: rewriteValue('$ref', $ref, namespace),
          ...rest,
        };
      }
      return {
        allOf: [
          { $ref: rewriteValue('$ref', $ref, namespace) },
          rewriteValue(key, rest, namespace),
        ],
      };
    }
    const rewritten = inner.rewriteObject(value, namespace);
    if ('properties' in rewritten) {
      const { required, ...properties } = rewriteOptionalToRequired(
        rewritten.properties
      );
      if (required.length > 0) {
        return { ...rewritten, properties, required };
      }
      return { ...rewritten, properties };
    }
    return rewritten;
  }
  if (key === '$ref') {
    if (value.includes('#/types')) {
      return value;
    }
    if (value in refMap) {
      return refMap[value];
    }
    return rewriteIdRef(value);
  }
  if (key === 'type' && value === 'any') {
    return undefined;
  }
  if (key === 'id') {
    return undefined;
  }
  if (key === 'pattern') {
    return rewritePatternFlags(value);
  }
  return value;
}

export function rewriteKey(key) {
  if (key === 'choices') {
    return 'anyOf';
  }
  return key;
}

function rewriteImport(schema, namespace) {
  const { $import, ...rest } = schema;
  const $ref = rewriteIdRef($import, namespace);
  return {
    $merge: {
      source: { $ref },
      with: rewriteValue('$merge', rest, namespace),
    },
  };
}

inner.rewriteObject = (schema, namespace) => {
  if ('$import' in schema) {
    return rewriteImport(schema, namespace);
  }
  return Object.keys(schema).reduce((obj, key) => {
    const value = rewriteValue(key, schema[key], namespace);
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
      const extendSchema = updatedSchemas[namespace]?.schema;
      if (!extendSchema) return;

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
    });
  });
  return updatedSchemas;
};

inner.updateWithAddonsLinterData = (firefoxSchemas, ourSchemas) => {
  const schemas = { ...firefoxSchemas };
  Object.keys(ourSchemas).forEach((namespace) => {
    const firefoxSchema = firefoxSchemas[namespace];
    const { file, ...ourSchema } = ourSchemas[namespace];
    // Allow overriding the namespace if `file` is set, this supports "$import".
    if (file) {
      schemas[ourSchema.id || namespace] = {
        ...firefoxSchema,
        file,
        // Use `deepPatch` to actually patch (instead of simply merging them)
        // the original schema with our own linter-specific tweaks
        schema: deepPatch(firefoxSchema.schema, ourSchema),
      };
    } else {
      schemas[namespace] = {
        ...firefoxSchema,
        // Use `deepPatch` to actually patch (instead of simply merging them)
        // the original schema with our own linter-specific tweaks
        schema: deepPatch(firefoxSchema?.schema, ourSchema),
      };
    }
  });
  return schemas;
};

export function loadTypes(types = []) {
  // Convert the array of types to an object.
  return types.reduce(
    (obj, type) => ({
      ...obj,
      [type.id]: type,
    }),
    {}
  );
}

function rewriteExtendRefs(definition, namespace, types) {
  if (Array.isArray(definition)) {
    return definition.map((value) =>
      rewriteExtendRefs(value, namespace, types)
    );
  }
  if (typeof definition === 'object') {
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
    (extendSchema.types || []).forEach((type) => {
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

export function filterSchemas(schemas) {
  return schemas.filter((schema) => {
    return !ignoredSchemas.includes(schema.namespace);
  });
}

/**
 * Merge multiple schemas into one if they are properties of each other.
 *
 * Example:
 *
 *  [{ namespace: "privacy", permissions: ["privacy"] },
 *   { namespace: "privacy.network", properties: { networkPredictionEnabled: {} } }]
 *
 *  becomes
 *
 *  [{ namespace: "privacy",
 *     permissions: ["privacy"],
 *     properties: {
 *       network: {
 *         properties: {
 *           networkPredictionEnabled: {}
 *  }}}}]
 */
export function foldSchemas(schemas) {
  // Map the schemas by prefix.
  const schemasByPrefix = {};
  schemas.forEach((schema) => {
    const [prefix, property, more] = schema.namespace.split('.', 3);
    if (more) {
      throw new Error('namespace may only have one level of nesting');
    }
    if (!(prefix in schemasByPrefix)) {
      schemasByPrefix[prefix] = {};
    }
    const namespace = property || 'baseNamespace';
    if (schemasByPrefix[prefix][namespace]) {
      throw new Error('matching namespaces are not allowed');
    } else {
      schemasByPrefix[prefix][namespace] = schema;
    }
  });
  // If there aren't any matching prefixes then there's no folding to do.
  const hasMatchingPrefixes = Object.keys(schemasByPrefix).some((prefix) => {
    const prefixedSchemas = schemasByPrefix[prefix];
    // Continue if there are multiple properties (baseNamespace and something
    // else) or there is one property that isn't baseNamespace.
    return (
      Object.keys(prefixedSchemas).length > 1 ||
      !('baseNamespace' in prefixedSchemas)
    );
  });
  if (!hasMatchingPrefixes) {
    return schemas;
  }

  // There is folding to do, join the matching schemas.
  const foldedSchemas = [];

  // The order of the schemas will be maintained since they were inserted in
  // the order of schemas.
  Object.keys(schemasByPrefix).forEach((namespace) => {
    const { baseNamespace = {}, ...nestedSchemas } = schemasByPrefix[namespace];
    foldedSchemas.push(baseNamespace);
    // Ensure the base namespace is set.
    baseNamespace.namespace = namespace;
    if (Object.keys(nestedSchemas).length > 0 && !baseNamespace.properties) {
      baseNamespace.properties = {};
    }
    Object.keys(nestedSchemas).forEach((property) => {
      const schema = nestedSchemas[property];
      delete schema.namespace;
      if (schema.types) {
        baseNamespace.types = baseNamespace.types || [];
        baseNamespace.types = baseNamespace.types.concat(schema.types);
        delete schema.types;
      }
      baseNamespace.properties[property] = schema;
    });
  });

  return foldedSchemas;
}

inner.normalizeSchema = (schemas, file) => {
  const filteredSchemas = foldSchemas(filterSchemas(schemas));
  let extendSchemas;
  let primarySchema;

  if (filteredSchemas.length === 1) {
    // If there is only a manifest namespace then this just extends the manifest.
    if (
      filteredSchemas[0].namespace === 'manifest' &&
      file !== 'manifest.json'
    ) {
      primarySchema = {
        namespace: file.slice(0, file.indexOf('.')),
      };
      extendSchemas = [filteredSchemas[0]];
    } else {
      [primarySchema] = filteredSchemas;
      extendSchemas = [];
    }
  } else {
    extendSchemas = filteredSchemas.slice(0, filteredSchemas.length - 1);
    primarySchema = filteredSchemas[filteredSchemas.length - 1];
  }
  const { namespace, types, ...rest } = primarySchema;
  const { types: extendTypes, ...extendRest } = rewriteExtend(
    extendSchemas,
    namespace
  );
  const updatedTypes = { ...loadTypes(types), ...extendTypes };
  return {
    ...rest,
    ...extendRest,
    id: namespace,
    types: updatedTypes,
  };
};

inner.loadSchema = (schema, file) => {
  const { id, ...rest } = inner.normalizeSchema(schema, file);
  return { id, ...inner.rewriteObject(rest, id) };
};

inner.mergeSchemas = (schemaLists) => {
  const schemas = {};
  Object.keys(schemaLists).forEach((namespace) => {
    const namespaceSchemas = schemaLists[namespace];
    if (namespaceSchemas.length === 1) {
      [schemas[namespace]] = namespaceSchemas;
    } else {
      const file = `${namespace}.json`;
      const merged = namespaceSchemas.reduce((memo, { schema }) => {
        return deepmerge(memo, schema);
      }, {});
      schemas[namespace] = { file, schema: merged };
    }
  });
  return schemas;
};

export function processSchemas(schemas) {
  const schemaListsByNamespace = {};
  schemas.forEach(({ file, schema }) => {
    // Convert the Firefox schema to more standard JSON schema.
    const loadedSchema = inner.loadSchema(schema, file);
    const { id } = loadedSchema;
    if (!(id in schemaListsByNamespace)) {
      schemaListsByNamespace[id] = [];
    }
    schemaListsByNamespace[id].push({ file, schema: loadedSchema });
  });
  const mergedSchemasByNamespace = inner.mergeSchemas(schemaListsByNamespace);
  // Now that everything is loaded, we can finish mapping the non-standard
  // $extend to $ref.
  return inner.mapExtendToRef(mergedSchemasByNamespace);
}

const SKIP_SCHEMAS = ['native_host_manifest.json'];

function readSchema(basePath, file) {
  return commentJson.parse(
    fs.readFileSync(path.join(basePath, file), 'utf-8'),
    null, // reviver
    true // remove_comments
  );
}

function writeSchema(basePath, file, schema) {
  fs.writeFileSync(
    path.join(basePath, file),
    `${JSON.stringify(schema, undefined, 2)}\n`
  );
}

function schemaFiles(basePath) {
  return fs.readdirSync(basePath);
}

function writeSchemasToFile(basePath, importedPath, loadedSchemas) {
  const ids = Object.keys(loadedSchemas);
  // Write out the schemas.
  ids.forEach((id) => {
    const { file, schema } = loadedSchemas[id];
    if (!file) return;

    writeSchema(importedPath, file, schema);
  });
  // Write out the index.js to easily import all schemas.
  const imports = ids
    .filter((id) => {
      return id !== 'manifest';
    })
    .map((id) => {
      const { file } = loadedSchemas[id];
      const basename = path.basename(file);
      return `import ${id} from './${basename}'`;
    })
    .join(';\n');
  const fileContents = `// This file is generated by the schema import script.

${imports};
export default [
  ${ids
    .filter((id) => {
      return id !== 'manifest';
    })
    .join(',\n  ')},
];
`;
  fs.writeFileSync(path.join(importedPath, 'index.js'), fileContents);
}

function loadSchemasFromFile(basePath) {
  const schemas = [];
  // Read the schemas into loadedSchemas.
  schemaFiles(basePath).forEach((file) => {
    if (SKIP_SCHEMAS.includes(file)) {
      return;
    }
    const schema = readSchema(basePath, file);
    schemas.push({ file, schema });
  });
  return schemas;
}

export function importSchemas(firefoxPath, ourPath, importedPath) {
  const rawSchemas = loadSchemasFromFile(firefoxPath);
  const ourSchemas = {
    ...readSchema(ourPath, 'manifest.json'),
    ...readSchema(ourPath, 'contextMenus.json'),
  };
  const processedSchemas = processSchemas(rawSchemas);
  const updatedSchemas = inner.updateWithAddonsLinterData(
    processedSchemas,
    ourSchemas
  );
  writeSchemasToFile(firefoxPath, importedPath, updatedSchemas);
}

inner.isBrowserSchema = (_path) => {
  return schemaRegexes.some((re) => re.test(_path));
};

export async function fetchSchemas({ inputPath, outputPath }) {
  const openZip = util.promisify(yauzl.open);
  const zipfile = await openZip(inputPath);
  const openReadStream = util.promisify(zipfile.openReadStream.bind(zipfile));
  const writeStreamsPromises = [];

  return new Promise((resolve, reject) => {
    zipfile
      .on('entry', async (entry) => {
        if (inner.isBrowserSchema(entry.fileName)) {
          const filePath = path.join(outputPath, path.basename(entry.fileName));

          // Collect the file streams we're creating here to be able to wait
          // for them to ensure we're closing their streams
          const destFileStream = fs.createWriteStream(filePath);
          writeStreamsPromises.push(
            new Promise((res) => destFileStream.on('close', res))
          );
          const readStream = await openReadStream(entry);

          readStream.pipe(destFileStream);
        }
      })
      .on('error', (error) => {
        reject(error);
      })
      .on('end', () => {
        Promise.all(writeStreamsPromises).then(resolve, reject);
      });
  });
}
