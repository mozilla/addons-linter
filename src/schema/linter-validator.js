import ajv from 'ajv';
import { isRelativeURL, isValidVersionString } from './formats';
import schemaObject from 'schema/manifest-schema.json';


var validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
});
validator.addFormat('versionString', isValidVersionString);
validator.addFormat('relativeURL', isRelativeURL);

export default validator.compile(schemaObject);
