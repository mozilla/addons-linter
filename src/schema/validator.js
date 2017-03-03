import ajv from 'ajv';
import URL from 'url-parse';
import { isRelativeURL, isValidVersionString } from './formats';

export var schemaObject = require('json!schema/imported/manifest');
const schemas = [
  require('json!schema/imported/alarms'),
  require('json!schema/imported/bookmarks'),
  require('json!schema/imported/browser_action'),
  require('json!schema/imported/browsing_data'),
  require('json!schema/imported/commands'),
  require('json!schema/imported/context_menus'),
  require('json!schema/imported/context_menus_internal'),
  require('json!schema/imported/contextual_identities'),
  require('json!schema/imported/cookies'),
  require('json!schema/imported/devtools'),
  require('json!schema/imported/devtools_inspected_window'),
  require('json!schema/imported/devtools_network'),
  require('json!schema/imported/devtools_panels'),
  require('json!schema/imported/downloads'),
  require('json!schema/imported/events'),
  require('json!schema/imported/extension'),
  require('json!schema/imported/extension_types'),
  require('json!schema/imported/history'),
  require('json!schema/imported/i18n'),
  require('json!schema/imported/identity'),
  require('json!schema/imported/idle'),
  require('json!schema/imported/management'),
  require('json!schema/imported/manifest'),
  require('json!schema/imported/notifications'),
  require('json!schema/imported/omnibox'),
  require('json!schema/imported/page_action'),
  require('json!schema/imported/runtime'),
  require('json!schema/imported/sessions'),
  require('json!schema/imported/sidebar_action'),
  require('json!schema/imported/storage'),
  require('json!schema/imported/tabs'),
  require('json!schema/imported/test'),
  require('json!schema/imported/theme'),
  require('json!schema/imported/top_sites'),
  require('json!schema/imported/web_navigation'),
  require('json!schema/imported/web_request'),
  require('json!schema/imported/windows'),
];

// const schemas = [];
// const schemaObject = require('json!schema/manifest-schema');

function isURL(value) {
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
validator.addFormat('relativeURL', isRelativeURL);
validator.addFormat('strictRelativeUrl', isStrictRelativeUrl);
validator.addFormat('url', isURL);

export default validator.compile(schemaObject);
