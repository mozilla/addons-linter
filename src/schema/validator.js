import ajv from 'ajv';
import { isRelativeURL, isValidVersionString } from './formats';

export var schemaObject = require('json!schema/manifest-schema');

var validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
});
validator.addFormat('versionString', isValidVersionString);
validator.addFormat('relativeURL', isRelativeURL);

export default validator.compile(schemaObject);
