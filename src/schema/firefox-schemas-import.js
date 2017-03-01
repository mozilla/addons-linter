import fs from 'fs';
import { join as joinPath } from 'path';

import commentJson from 'comment-json';

import { processSchemas } from './firefox-schemas';

const SKIP_SCHEMAS = [
  'native_host_manifest.json',
];

function readSchema(path, file) {
  return commentJson.parse(
    fs.readFileSync(joinPath(path, file), 'utf-8'),
    null, // reviver
    true, // remove_comments
  );
}

function writeSchema(path, file, schema) {
  fs.writeFile(
    joinPath(path, file),
    `${JSON.stringify(schema, undefined, 2)}\n`);
}

function schemaFiles(path) {
  return fs.readdirSync(path);
}

function writeSchemasToFile(path, loadedSchemas) {
  // Write out the schemas.
  Object.keys(loadedSchemas).forEach((id) => {
    const { file, schema } = loadedSchemas[id];
    writeSchema(joinPath(path, '..', 'imported'), file, schema);
  });
}

function loadSchemasFromFile(path) {
  const schemas = [];
  // Read the schemas into loadedSchemas.
  schemaFiles(path).forEach((file) => {
    if (SKIP_SCHEMAS.includes(file)) {
      return;
    }
    const schema = readSchema(path, file);
    schemas.push({ file, schema });
  });
  return schemas;
}

export function importSchemas() {
  const path = process.argv[2];
  const rawSchemas = loadSchemasFromFile(path);
  const processedSchemas = processSchemas(rawSchemas);
  writeSchemasToFile(path, processedSchemas);
}

importSchemas();
