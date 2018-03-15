import ajv from 'ajv';
import ajvMergePatch from 'ajv-merge-patch';

import merge from 'schema/deepmerge';
import schemaObject from 'schema/imported/manifest';
import themeSchemaObject from 'schema/imported/theme';
import messagesSchemaObject from 'schema/messages';

import {
  imageDataOrStrictRelativeUrl,
  isAnyUrl,
  isAbsoluteUrl,
  isStrictRelativeUrl,
  isSecureUrl,
  isUnresolvedRelativeUrl,
  isValidVersionString,
} from './formats';
import schemas from './imported';

const validator = ajv({
  allErrors: true,
  errorDataPath: 'property',
  jsonPointers: true,
  verbose: true,
  schemas,
  schemaId: 'auto',
});

validator.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

ajvMergePatch(validator);

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
// homepageUrl is the same as relativeUrl but Firefox will encode | characters.
validator.addFormat('homepageUrl', isAnyUrl);
validator.addFormat('strictRelativeUrl', isStrictRelativeUrl);
validator.addFormat('unresolvedRelativeUrl', isUnresolvedRelativeUrl);
validator.addFormat('secureUrl', isSecureUrl);

validator.addFormat('imageDataOrStrictRelativeUrl', imageDataOrStrictRelativeUrl);

function filterErrors(errors) {
  if (errors) {
    return errors.filter((error) => error.keyword !== '$merge');
  }
  return errors;
}

const _validateAddon = validator.compile({
  ...schemaObject,
  id: 'manifest',
  $ref: '#/types/WebExtensionManifest',
});

export const validateAddon = (...args) => {
  const isValid = _validateAddon(...args);
  validateAddon.errors = filterErrors(_validateAddon.errors);
  return isValid;
};

const _validateLangPack = validator.compile({
  ...schemaObject,
  id: 'langpack-manifest',
  $ref: '#/types/WebExtensionLangpackManifest',
});

export const validateLangPack = (...args) => {
  const isValid = _validateLangPack(...args);
  validateLangPack.errors = filterErrors(_validateLangPack.errors);
  return isValid;
};

// Create a new schema object that merges theme.json and the regular
// manifest.json schema.
// Then modify the result of that to allow `additionalProperties = false`
// so that additional properties are not allowed for themes.
// We have to use deepmerge here to make sure we can overwrite the nested
// structure and can use object-destructuring at the root level
// because we only overwrite `id` and `$ref` in root of the resulting object.
const _validateStaticTheme = validator.compile({
  ...merge(
    schemaObject,
    merge(themeSchemaObject, {
      types: {
        ThemeManifest: {
          $merge: {
            with: {
              additionalProperties: false,
            },
          },
        },
      },
    }),
  ),
  id: 'static-theme-manifest',
  $ref: '#/types/ThemeManifest',
});

export const validateStaticTheme = (...args) => {
  const isValid = _validateStaticTheme(...args);
  validateStaticTheme.errors = filterErrors(_validateStaticTheme.errors);
  return isValid;
};

const _validateLocaleMessages = validator.compile({
  ...messagesSchemaObject,
  id: 'messages',
  $ref: '#/types/WebExtensionMessages',
});

export const validateLocaleMessages = (...args) => {
  const isValid = _validateLocaleMessages(...args);
  validateLocaleMessages.errors = filterErrors(_validateLocaleMessages.errors);
  return isValid;
};
