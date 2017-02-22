import ajv from 'ajv';
import URL from 'url-parse';
import { isRelativeURL, isValidVersionString } from './formats';

export var schemaObject = require('json!schema/imported/manifest');

const schemas = [
  require('json!schema/imported/alarms'),
  require('json!schema/imported/contextual_identities'),
  require('json!schema/imported/cookies'),
  require('json!schema/imported/downloads'),
  require('json!schema/imported/events'),
  require('json!schema/imported/extension'),
  require('json!schema/imported/extension_types'),
  require('json!schema/imported/i18n'),
  require('json!schema/imported/identity'),
  require('json!schema/imported/idle'),
  require('json!schema/imported/management'),
  require('json!schema/imported/notifications'),
  require('json!schema/imported/runtime'),
  require('json!schema/imported/storage'),
  require('json!schema/imported/test'),
  require('json!schema/imported/top_sites'),
  require('json!schema/imported/web_navigation'),
  require('json!schema/imported/web_request'),
];

function isURL(value) {
  const url = new URL(value);
  return url.protocol === 'https:';
}


var validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
  schemas,
});
validator.addFormat('versionString', isValidVersionString);
validator.addFormat('relativeURL', isRelativeURL);
validator.addFormat('url', isURL);

export default validator.compile(schemaObject);
