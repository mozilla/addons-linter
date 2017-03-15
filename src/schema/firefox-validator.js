import fs from 'fs';
import path from 'path';

import ajv from 'ajv';
import URL from 'url-parse';
import { isRelativeURL, isValidVersionString } from './formats';

const schemaObject = require('json!schema/imported/manifest');
const schemaPath = 'src/schema/imported';
const schemas = fs.readdirSync(schemaPath).map((filename) => {
  const filePath = path.join(schemaPath, filename);
  return JSON.parse(fs.readFileSync(filePath));
});

function isURL(value) {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol);
}

function isSecureURL(value) {
  const url = new URL(value);
  return url.protocol === 'https:';
}

function isStrictRelativeUrl(value) {
  return !value.startsWith('//') && isRelativeURL(value);
}

var validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
  schemas,
});

validator.addFormat('versionString', isValidVersionString);
validator.addFormat('relativeUrl', isRelativeURL);
validator.addFormat('strictRelativeUrl', isStrictRelativeUrl);
validator.addFormat('url', isURL);
validator.addFormat('secureUrl', isSecureURL);
validator.addFormat('deprecated', () => false);

export default validator.compile(schemaObject);
