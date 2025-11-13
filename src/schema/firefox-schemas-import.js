import fs from 'fs';
import path from 'path';
import util from 'util';

import { oneLine } from 'common-tags';
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

export const FLAG_PATTERN_REWRITES = {
  // Extension ID, UUID format.
  '(?i)^\\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\}$':
    '^\\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\}$',
  // Extension ID, email format.
  '(?i)^[a-z0-9-._]*@[a-z0-9-._]+$': '^[a-zA-Z0-9-._]*@[a-zA-Z0-9-._]+$',
};

const UNRECOGNIZED_PROPERTY_REFS = [
  'UnrecognizedProperty',
  'manifest#/types/UnrecognizedProperty',
];

const SKIP_SCHEMAS = ['native_host_manifest.json'];

const schemaRegexes = [
  // eslint-disable-next-line prefer-regex-literals
  new RegExp('browser/components/extensions/schemas/.*\\.json'),
  // eslint-disable-next-line prefer-regex-literals
  new RegExp('toolkit/components/extensions/schemas/.*\\.json'),
];

export const refMap = {
  ExtensionURL: 'manifest#/types/ExtensionURL',
  HttpURL: 'manifest#/types/HttpURL',
  ImageDataOrExtensionURL: 'manifest#/types/ImageDataOrExtensionURL',
  IconPath: 'manifest#/types/IconPath',
  ThemeIcons: 'manifest#/types/ThemeIcons',
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
        schema: deepPatch(firefoxSchema.schema, ourSchema),
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

// This method does propagate a top level supported manifest version
// range to the type definition properties (needed to make sure the
// keywords min/max_manifest_version are going to be triggered while
// validating the extended manifest definition properties)
//
// NOTE: we only need this as part of the extended manifest types
// part of the API namespace schema files.
function propagateManifestVersionRestrictions({
  definition,
  max_manifest_version,
  min_manifest_version,
}) {
  if (min_manifest_version == null && max_manifest_version == null) {
    return;
  }
  for (const prop of Object.values(definition.properties || {})) {
    let target = prop;
    // a property using $ref has to be rewritten into an allOf
    // form to be valid from a JSONSchema perspective (adding any
    // other prop would make $ref to be ignored):
    //
    //   {
    //     allOf: [
    //       { $ref: '...' },
    //       {min/max_manifest_version}
    //     ]
    //   }
    //
    if ('$ref' in prop) {
      target = {};
      prop.allOf = [{ $ref: prop.$ref }, target];
      delete prop.$ref;
    }
    if (max_manifest_version != null && target.max_manifest_version == null) {
      target.max_manifest_version = max_manifest_version;
    }
    if (min_manifest_version != null && target.min_manifest_version == null) {
      target.min_manifest_version = min_manifest_version;
    }
  }
}

export function rewriteExtend(schemas, schemaId) {
  const definitions = {};
  const refs = {};
  const types = {};
  schemas.forEach((extendSchema) => {
    const extendId = extendSchema.namespace;
    const { max_manifest_version, min_manifest_version } = extendSchema;
    const extendDefinitions = {};
    const extendTypes = {};
    (extendSchema.types || []).forEach((type) => {
      const { $extend, id, ...rest } = type;
      if ($extend) {
        // Throw an explicit error if we are going to deep merge a set of properties which may be
        // overriding an existing one, instead of extending the type with new ones as expected.
        if (rest.properties) {
          const newProps = Object.keys(rest.properties);
          if (
            !newProps.every(
              // Make sure that the value set of each property name that we are going to merge
              // is null or undefined.
              (k) => extendDefinitions?.[$extend]?.properties?.[k] == null
            )
          ) {
            throw new Error(oneLine`Unsupported schema format:
              detected multiple extend schema entries overwriting existing properties
              while processing "${schemaId}" namespace
            `);
          }
        }
        // Move the $extend into definitions.
        //
        // NOTE: some schema files, like browser_action.json, may contain more than one extends
        // and so here we use deepmerge to merge the multiple extended definitions instead
        // of overwriting it with the last one processed.
        extendDefinitions[$extend] = deepmerge(
          extendDefinitions[$extend] ?? {},
          rest
        );
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
      if (extendId === 'manifest') {
        // if the definition is extending the manifest types, we have to
        // propagate the min/max_manifest_version keyword to the definitions
        // attributes (which make sure we will collect validation errors if
        // the manifest property is part of an API namespace unsupported on
        // the addon manifest version.
        propagateManifestVersionRestrictions({
          definition,
          max_manifest_version,
          min_manifest_version,
        });
      }
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

// Normalize the JSONSchema, gets an array of JSONSchema objects and return an array of
// normalized JSONSchema objects (a JSONSchema file may contain more than one API namespace,
// e.g. like menus.json and browser_action.json).
//
// (schemas: Array<Object>, file: string) -> Array<Object>
inner.normalizeSchema = (schemas, file) => {
  const filteredSchemas = foldSchemas(filterSchemas(schemas));
  let manifestExtendSchemas;
  let apiNamespaceSchemas;

  if (filteredSchemas.length === 1) {
    // If there is only a manifest namespace then this just extends the manifest.
    if (
      filteredSchemas[0].namespace === 'manifest' &&
      file !== 'manifest.json'
    ) {
      apiNamespaceSchemas = [
        {
          namespace: file.slice(0, file.indexOf('.')),
        },
      ];
      manifestExtendSchemas = [filteredSchemas[0]];
    } else {
      apiNamespaceSchemas = filteredSchemas;
      manifestExtendSchemas = [];
    }
  } else {
    manifestExtendSchemas = filteredSchemas.filter((s) => {
      return s.namespace === 'manifest' && file !== 'manifest.json';
    });
    apiNamespaceSchemas = filteredSchemas.filter((s) => {
      return !manifestExtendSchemas.includes(s);
    });
  }

  // Rewrite manifest extend types using each api namespace in the file.
  return apiNamespaceSchemas.map((apiSchema) => {
    const { namespace, types, $import, ...rest } = apiSchema;
    const { types: extendTypes, ...extendRest } = rewriteExtend(
      manifestExtendSchemas,
      namespace
    );
    const updatedTypes = { ...loadTypes(types), ...extendTypes };

    const getImportedProps = () => {
      if (typeof $import !== 'string') {
        return {};
      }
      // menus.json and browser_action.json contain the definition of two API
      // namespaces, one just import the other one defined in the same file
      // (e.g. "contextMenus" imports "menus", "browser_action" imports "action"),
      // we want to expand those definitions otherwise they will be converted into
      // a $merge form, which is only used in the manifest validation and so the
      // eslint rules that look for the API method definitions will not work as expected.
      const {
        // We don't want to import into the target schema the `namespace` name and
        // the manifest versioning fields (e.g. "browserAction" has max_manifest_version 2
        // and it imports "action" which has min_manifest_version 3, and Firefox seems to
        // also ignore them while processing the "$import").
        namespace: importedNamespace,
        min_manifest_version,
        max_manifest_version,
        ...importedRest
      } = apiNamespaceSchemas.find((schema) => schema.namespace === $import);
      if (importedRest.$import) {
        throw new Error(oneLine`Unsupported schema format:
          "${namespace}" is importing "${importedNamespace}"
          which also includes an "$import" property
        `);
      }
      return importedRest;
    };

    return {
      ...getImportedProps(),
      ...rest,
      ...extendRest,
      id: namespace,
      types: updatedTypes,
    };
  });
};

// (schemas: Array<Object>, file: string) -> Array<Object>
inner.loadSchema = (schemas, file) => {
  return inner.normalizeSchema(schemas, file).map((normalizedSchema) => {
    const { id, ...rest } = normalizedSchema;
    return { id, ...inner.rewriteObject(rest, id) };
  });
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
    inner.loadSchema(schema, file).forEach((loadedSchema) => {
      const { id } = loadedSchema;
      if (!(id in schemaListsByNamespace)) {
        schemaListsByNamespace[id] = [];
      }
      schemaListsByNamespace[id].push({ file, schema: loadedSchema });
    });
  });
  const mergedSchemasByNamespace = inner.mergeSchemas(schemaListsByNamespace);
  // Now that everything is loaded, we can finish mapping the non-standard
  // $extend to $ref.
  return inner.mapExtendToRef(mergedSchemasByNamespace);
}

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
  ids.forEach((currId) => {
    const { file, schema } = loadedSchemas[currId];
    const { id, ...rest } = schema;
    writeSchema(
      importedPath,
      file,
      // Normalize schema to draft7 spec
      // (required for ajv v8).
      { $id: id, ...rest }
    );
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
  // Somehow we need a different shape for `ourSchemas` (that isn't an array of
  // schemas but an object) so let's do it!
  const ourSchemas = loadSchemasFromFile(ourPath).reduce((acc, { schema }) => {
    return {
      ...acc,
      ...schema,
    };
  }, {});
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

// This method is used automatically when we import the schema files from
// a local mozilla-central working tree instead of from a zipped archive
// (e.g. to evaluate impacts of changes to the schema format while they are still
// in work and not landed yet).
async function fetchSchemasFromDir({ inputPath, outputPath }) {
  const toolkitSchemasBaseDir = path.join(
    inputPath,
    'toolkit',
    'components',
    'extensions',
    'schemas'
  );
  const browserSchemasBaseDir = path.join(
    inputPath,
    'browser',
    'components',
    'extensions',
    'schemas'
  );

  const promiseLoadSchemaFrom = (baseDir) =>
    fs.promises
      .readdir(baseDir, { encoding: 'utf-8' })
      .then((files) =>
        files
          .filter((fp) => fp.endsWith('.json'))
          .map((fp) => path.join(baseDir, fp))
      );

  return Promise.all([
    promiseLoadSchemaFrom(toolkitSchemasBaseDir),
    promiseLoadSchemaFrom(browserSchemasBaseDir),
  ]).then((results) => {
    const allFiles = results.flat();
    const writeStreamsPromises = allFiles.map((filePath) => {
      const outFilePath = path.join(outputPath, path.basename(filePath));
      const destFileStream = fs.createWriteStream(outFilePath);
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(destFileStream);
      // Ensure we're closing all the created write streams before resolving.
      return new Promise((resolve) => {
        destFileStream.on('close', resolve);
      });
    });
    return Promise.all(writeStreamsPromises);
  });
}

export async function fetchSchemas({ inputPath, outputPath }) {
  const inputFileStat = fs.statSync(inputPath);
  if (inputFileStat.isDirectory()) {
    return fetchSchemasFromDir({ inputPath, outputPath });
  }

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
            new Promise((res) => {
              destFileStream.on('close', res);
            })
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
