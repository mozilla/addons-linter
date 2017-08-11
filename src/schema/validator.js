import ajv from 'ajv';

import schemaObject from 'schema/imported/manifest';

import {
  isAnyUrl,
  isAbsoluteUrl,
  isStrictRelativeUrl,
  isSecureUrl,
  isValidVersionString,
} from './formats';
import schemas from './imported';

const validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
  schemas,
});

validator.addFormat('versionString', isValidVersionString);
validator.addFormat('deprecated', () => false);
validator.addFormat('contentSecurityPolicy', () => true);
validator.addFormat('ignore', () => true);

// URL formats. The format names don't mean what you'd think, see bug 1354342.
//
// url -> MUST be absolute URL
// relativeUrl -> CHOICE of absolute URL or relative URL (including protocol relative)
// strictRelativeUrl -> MUST be relative, but not protocol relative (path only)
validator.addFormat('url', isAbsoluteUrl);
validator.addFormat('relativeUrl', isAnyUrl);
validator.addFormat('strictRelativeUrl', isStrictRelativeUrl);
validator.addFormat('secureUrl', isSecureUrl);

export default validator.compile(schemaObject);
