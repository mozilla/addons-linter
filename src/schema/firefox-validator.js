import ajv from 'ajv';
import URL from 'url-parse';
import { isRelativeURL, isValidVersionString } from './formats';

import schemas from './firefox-schemas';
const schemaObject = require('json!schema/imported/manifest');

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
