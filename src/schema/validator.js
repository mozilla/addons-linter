import ajv from 'ajv';
import ajvMergePatch from 'ajv-merge-patch';

import { deepPatch } from 'schema/deepmerge';
import schemaObject from 'schema/imported/manifest';
import themeSchemaObject from 'schema/imported/theme';
import messagesSchemaObject from 'schema/messages';
import { DEPRECATED_STATIC_THEME_LWT_ALIASES } from 'const';

import {
  imageDataOrStrictRelativeUrl,
  isAnyUrl,
  isAbsoluteUrl,
  isStrictRelativeUrl,
  isSecureUrl,
  isUnresolvedRelativeUrl,
  isValidVersionString,
  manifestShortcutKey,
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
validator.addFormat('manifestShortcutKey', manifestShortcutKey);

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

validator.addFormat(
  'imageDataOrStrictRelativeUrl',
  imageDataOrStrictRelativeUrl
);

validator.addKeyword('deprecated', {
  validate: function validateDeprecated(message, propValue, schema, dataPath) {
    if (!DEPRECATED_STATIC_THEME_LWT_ALIASES.includes(dataPath)) {
      // Do not emit errors for every deprecated property, as it may introduce
      // regressions due to unexpected new deprecation messages raised as errors,
      // better to deal with it separately.
      return true;
    }

    validateDeprecated.errors = [
      {
        keyword: 'deprecated',
        message,
      },
    ];

    return false;
  },
  errors: true,
});

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

// Create a new schema object that merges theme.json and the regular
// manifest.json schema.
// Then modify the result of that to set `additionalProperties = false`
// so that additional properties are not allowed for themes.
// We have to use deepmerge here to make sure we can overwrite the nested
// structure and can use object-destructuring at the root level
// because we only overwrite `id` and `$ref` in root of the resulting object.
// Uses ``deepPatch`` (instead of deepmerge) because we're patching a
// complicated schema instead of simply merging them together.
const _validateStaticTheme = validator.compile({
  ...deepPatch(
    schemaObject,
    deepPatch(themeSchemaObject, {
      types: {
        ThemeManifest: {
          $merge: {
            with: {
              additionalProperties: false,
            },
          },
        },
      },
    })
  ),
  id: 'static-theme-manifest',
  $ref: '#/types/ThemeManifest',
});

export const validateStaticTheme = (...args) => {
  const isValid = _validateStaticTheme(...args);
  validateStaticTheme.errors = filterErrors(_validateStaticTheme.errors);
  return isValid;
};

// Like with static themes, we don't want additional properties in langpacks.
// The only difference is, this time, there is no additional schema file, we
// just need to reference WebExtensionLangpackManifest and merge it with the
// object that has additionalProperties: false.
// Uses ``deepPatch`` (instead of deepmerge) because we're patching a
// complicated schema instead of simply merging them together.
const _validateLangPack = validator.compile({
  ...deepPatch(schemaObject, {
    types: {
      WebExtensionLangpackManifest: {
        $merge: {
          with: {
            additionalProperties: false,
          },
        },
      },
    },
  }),
  id: 'langpack-manifest',
  $ref: '#/types/WebExtensionLangpackManifest',
});

export const validateLangPack = (...args) => {
  const isValid = _validateLangPack(...args);
  validateLangPack.errors = filterErrors(_validateLangPack.errors);
  return isValid;
};

// Like with langpacks, we don't want additional properties in dictionaries,
// and there is no separate schema file.
// Uses ``deepPatch`` (instead of deepmerge) because we're patching a
// complicated schema instead of simply merging them together.
const _validateDictionary = validator.compile({
  ...deepPatch(schemaObject, {
    types: {
      WebExtensionDictionaryManifest: {
        $merge: {
          with: {
            additionalProperties: false,
          },
        },
      },
    },
  }),
  id: 'dictionary-manifest',
  $ref: '#/types/WebExtensionDictionaryManifest',
});

export const validateDictionary = (...args) => {
  const isValid = _validateDictionary(...args);
  validateDictionary.errors = filterErrors(_validateDictionary.errors);
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
