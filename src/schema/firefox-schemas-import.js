import fs from 'fs';
import path from 'path';

import commentJson from 'comment-json';

import { processSchemas } from './firefox-schemas';

const SKIP_SCHEMAS = [
  'native_host_manifest.json',
];

function readSchema(basePath, file) {
  return commentJson.parse(
    fs.readFileSync(path.join(basePath, file), 'utf-8'),
    null, // reviver
    true, // remove_comments
  );
}

function writeSchema(basePath, file, schema) {
  fs.writeFile(
    path.join(basePath, file),
    `${JSON.stringify(schema, undefined, 2)}\n`);
}

function schemaFiles(basePath) {
  return fs.readdirSync(basePath);
}

function writeSchemasToFile(basePath, loadedSchemas) {
  // Write out the schemas.
  Object.keys(loadedSchemas).forEach((id) => {
    const { file, schema } = loadedSchemas[id];
    writeSchema(path.join(basePath, '..', 'imported'), file, schema);
  });
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

export function importSchemas(firefoxPath = process.argv[2]) {
  const ourPath = process.argv[3];
  const rawSchemas = loadSchemasFromFile(firefoxPath);
  const ourSchemas = loadSchemasFromFile(ourPath);
  const processedSchemas = processSchemas(rawSchemas, ourSchemas);
  writeSchemasToFile(firefoxPath, processedSchemas);
}
