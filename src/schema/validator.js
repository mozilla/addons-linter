import ajv from 'ajv';
import ajvMergePatch from 'ajv-merge-patch';

import { getDefaultConfigValue } from 'yargs-options';
import { deepPatch } from 'schema/deepmerge';
import schemaObject from 'schema/imported/manifest';
import themeSchemaObject from 'schema/imported/theme';
import messagesSchemaObject from 'schema/messages';
import {
  DEPRECATED_MANIFEST_PROPERTIES,
  MANIFEST_VERSION_DEFAULT,
} from 'const';

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

const jsonSchemaDraft06 = require('ajv/lib/refs/json-schema-draft-06.json');

function filterErrors(errors) {
  if (errors) {
    return errors.filter((error) => {
      return error.keyword !== '$merge';
    });
  }
  return errors;
}

export class SchemaValidator {
  /**
   * Create a SchemaValidator instance, optionally customized by the given options.
   *
   * @param {object} validatorOptions
   * @param {number} [validatorOptions.minManifestVersion]
   *   An optional parameter to be set to customize the lowest value allowed in the
   *   manifest_version manifest property of the validated extensions.
   *   Default to `getDefaultConfigValue('min-manifest-version')`.
   * @param {number} [validatorOptions.maxManifestVersion]
   *   An optional parameter to be set to customize the highest value allowed in the
   *   manifest_version manifest property of the validated extensions.
   *   Default to `getDefaultConfigValue('max-manifest-version')`.
   * @param {object} [validatorOptions.schemas]
   *   An optional parameter with a set of custom schema data to use (used in unit tests).
   *   If not passed the SchemaValidator instance defaults to the schema data imported
   *   from Firefox.
   * @param {object} [validatorOptions.schemaObject]
   *   An optional parameter with a set of custom schema data for the base manifest types
   *   (used in unit tests).
   *   If not passed the SchemaValidator instance defaults to the schema data exported
   *   from `schema/imported/manifest`.
   * @param {object} [validatorOptions.themeSchemaObject]
   *   An optional parameter with a set of custom schema data for the theme manifest types
   *   (to be used in unit tests if necessary).
   *   If not passed the SchemaValidator instance defaults to the schema data exported
   *   from `schema/imported/theme`.
   * @param {object} [validatorOptions.messagesSchemaObject]
   *   An optional parameter with a set of custom schema data for the i18n messages json
   *   files (to be used in unit tests if necessary).
   *   If not passed the SchemaValidator instance defaults to the schema data exported
   *   from `schema/messages`.
   */
  constructor(validatorOptions) {
    this._options = validatorOptions;

    const validator = ajv({
      allErrors: true,
      errorDataPath: 'property',
      jsonPointers: true,
      verbose: true,
      schemas: this.schemas,
      schemaId: 'auto',
    });

    validator.addMetaSchema(jsonSchemaDraft06);
    ajvMergePatch(validator);
    this._addCustomFormats(validator);
    this._addCustomKeywords(validator);
    this._validator = validator;
  }

  matchOptions(validatorOptions) {
    if (this._options === validatorOptions) {
      return true;
    }
    const currKeys = Object.keys(this._options || {});
    const newKeys = Object.keys(validatorOptions || {});
    if (currKeys.length !== newKeys.length) {
      return false;
    }
    // Does match if the option values are strictly equal (does not if the values
    // are "deep equal", but it is enough to let us optimize the real production
    // executions and the ones from testing).
    return currKeys.every(
      (key) => this._options[key] === validatorOptions[key]
    );
  }

  _lazyInit() {
    // Lazily compile the addon validator, its base manifest definitions
    // are also needed for the static theme, dictionary and langpack validators.
    if (!this._addonValidator) {
      const { _validator, _options } = this;
      this._addonValidator = this._compileAddonValidator(_validator, _options);
    }

    return this._addonValidator;
  }

  get schemas() {
    return this._options?.schemas ?? schemas;
  }

  get schemaObject() {
    return this._options?.schemaObject ?? schemaObject;
  }

  get themeSchemaObject() {
    return this._options?.themeSchemaObject ?? themeSchemaObject;
  }

  get messagesSchemaObject() {
    return this._options?.messagesSchemaObject ?? messagesSchemaObject;
  }

  get validateAddon() {
    this._lazyInit();
    return this._addonValidator;
  }

  get validateStaticTheme() {
    this._lazyInit();

    if (!this._staticThemeValidator) {
      // Create a new schema object that merges theme.json and the regular
      // manifest.json schema.
      // Then modify the result of that to set `additionalProperties = false`
      // so that additional properties are not allowed for themes.
      // We have to use deepmerge here to make sure we can overwrite the nested
      // structure and can use object-destructuring at the root level
      // because we only overwrite `id` and `$ref` in root of the resulting object.
      // Uses ``deepPatch`` (instead of deepmerge) because we're patching a
      // complicated schema instead of simply merging them together.
      this._staticThemeValidator = this._validator.compile({
        ...deepPatch(
          this.schemaObject,
          deepPatch(this.themeSchemaObject, {
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
    }

    return this._staticThemeValidator;
  }

  get validateLangPack() {
    this._lazyInit();

    if (!this._langPackValidator) {
      // Like with static themes, we don't want additional properties in langpacks.
      // The only difference is, this time, there is no additional schema file, we
      // just need to reference WebExtensionLangpackManifest and merge it with the
      // object that has additionalProperties: false.
      // Uses ``deepPatch`` (instead of deepmerge) because we're patching a
      // complicated schema instead of simply merging them together.
      this._langPackValidator = this._validator.compile({
        ...deepPatch(this.schemaObject, {
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
    }

    return this._langPackValidator;
  }

  get validateDictionary() {
    this._lazyInit();

    if (!this._dictionaryValidator) {
      // Like with langpacks, we don't want additional properties in dictionaries,
      // and there is no separate schema file.
      // Uses ``deepPatch`` (instead of deepmerge) because we're patching a
      // complicated schema instead of simply merging them together.
      this._dictionaryValidator = this._validator.compile({
        ...deepPatch(this.schemaObject, {
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
    }

    return this._dictionaryValidator;
  }

  get validateLocale() {
    if (!this._localeValidator) {
      this._localeValidator = this._validator.compile({
        ...this.messagesSchemaObject,
        id: 'messages',
        $ref: '#/types/WebExtensionMessages',
      });
    }

    return this._localeValidator;
  }

  _compileAddonValidator(validator, validatorOptions) {
    const { minManifestVersion, maxManifestVersion } = validatorOptions;

    let schemaData = this.schemaObject;

    if (minManifestVersion != null || maxManifestVersion != null) {
      const minimum =
        minManifestVersion == null
          ? getDefaultConfigValue('min-manifest-version')
          : minManifestVersion;
      const maximum =
        maxManifestVersion == null
          ? getDefaultConfigValue('max-manifest-version')
          : maxManifestVersion;

      // Make sure the version range is valid, if it is not:
      // raise an explicit error.
      if (maxManifestVersion < minManifestVersion) {
        throw new Error(
          `Invalid manifest version range requested: ${JSON.stringify({
            maxManifestVersion,
            minManifestVersion,
          })}`
        );
      }

      schemaData = deepPatch(this.schemaObject, {
        types: {
          ManifestBase: {
            properties: {
              manifest_version: { minimum, maximum },
            },
          },
        },
      });
    }

    return validator.compile({
      ...schemaData,
      id: 'manifest',
      $ref: '#/types/WebExtensionManifest',
    });
  }

  _addCustomFormats(validator) {
    validator.addFormat('versionString', isValidVersionString);
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
  }

  _addCustomKeywords(validator) {
    validator.addKeyword('deprecated', {
      validate: function validateDeprecated(
        message,
        propValue,
        schema,
        dataPath
      ) {
        if (
          !Object.prototype.hasOwnProperty.call(
            DEPRECATED_MANIFEST_PROPERTIES,
            dataPath
          )
        ) {
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

    function createManifestVersionValidateFn(keyword, condFn) {
      // function of type SchemaValidateFunction (see ajv typescript signatures).
      return function validate(
        keywordSchemaValue,
        propValue,
        schema,
        dataPath,
        parentData,
        parentDataProperty,
        rootData
      ) {
        const manifestVersion =
          (rootData && rootData.manifest_version) || MANIFEST_VERSION_DEFAULT;
        const res = condFn(keywordSchemaValue, manifestVersion);
        if (!res) {
          validate.errors = [
            {
              keyword,
              params: { [keyword]: keywordSchemaValue },
            },
          ];
        }
        return res;
      };
    }

    validator.addKeyword('max_manifest_version', {
      // function of type SchemaValidateFunction (see ajv typescript signatures).
      validate: createManifestVersionValidateFn(
        'max_manifest_version',
        (maxMV, manifestVersion) => maxMV >= manifestVersion
      ),
      errors: true,
    });

    validator.addKeyword('min_manifest_version', {
      validate: createManifestVersionValidateFn(
        'min_manifest_version',
        (minMV, manifestVersion) => minMV <= manifestVersion
      ),
      errors: true,
    });
  }
}

const schemaValidators = new Set();
export function getValidator(validatorOptions) {
  // Compiling the schemas for the SchemaValidator instances is quite expensive,
  // while running in production the validatorOptions should be the same for the
  // entire addons-linter execution and so returning a cached instance will
  // make it less expensive.
  //
  // On test we may want to force usage of a non cached instance (e.g. because
  // the test case does pass custom schema data to unit test certain behavior
  // independently from what actually used in the Firefox schema files imported.
  if (validatorOptions?.forceNewValidatorInstance) {
    return new SchemaValidator(validatorOptions);
  }

  // Return an existing instance if the validator options match.
  for (const schemaValidator of schemaValidators) {
    if (schemaValidator && schemaValidator.matchOptions(validatorOptions)) {
      return schemaValidator;
    }
  }

  // Create a new SchemaValidator instance and cache it for the next calls
  // received for the same validatorOptions.
  const schemaValidator = new SchemaValidator(validatorOptions);
  schemaValidators.add(schemaValidator);
  return schemaValidator;
}

export const validateAddon = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  const isValid = validator.validateAddon(manifestData);
  validateAddon.errors = filterErrors(validator.validateAddon.errors);
  return isValid;
};

export const validateStaticTheme = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  const isValid = validator.validateStaticTheme(manifestData);
  validateStaticTheme.errors = filterErrors(
    validator.validateStaticTheme.errors
  );
  return isValid;
};

export const validateLangPack = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  const isValid = validator.validateLangPack(manifestData);
  validateLangPack.errors = filterErrors(validator.validateLangPack.errors);
  return isValid;
};

export const validateDictionary = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  const isValid = validator.validateDictionary(manifestData);
  validateDictionary.errors = filterErrors(validator.validateDictionary.errors);
  return isValid;
};

export const validateLocaleMessages = (
  localeMessagesData,
  validatorOptions = {}
) => {
  const validator = getValidator(validatorOptions);
  const isValid = validator.validateLocale(localeMessagesData);
  validateLocaleMessages.errors = filterErrors(validator.validateLocale.errors);
  return isValid;
};
