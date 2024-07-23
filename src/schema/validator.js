import Ajv from 'ajv';

import ajvMergePatch from 'ajv-merge-patch';
import { getDefaultConfigValue } from 'yargs-options';
import { deepPatch } from 'schema/deepmerge';
import schemaObject from 'schema/imported/manifest';
import themeSchemaObject from 'schema/imported/theme';
import messagesSchemaObject from 'schema/i18n_messages';
import {
  DEPRECATED_MANIFEST_PROPERTIES,
  MANIFEST_VERSION_DEFAULT,
  SCHEMA_KEYWORDS,
} from 'const';

import {
  imageDataOrStrictRelativeUrl,
  isAnyUrl,
  isAbsoluteUrl,
  isOrigin,
  isStrictRelativeUrl,
  isSecureUrl,
  isUnresolvedRelativeUrl,
  manifestShortcutKey,
} from './formats';
import schemas from './imported';

function isRelevantError({
  error,
  manifest_version,
  allowedManifestVersionsRange,
}) {
  // The errors related to the manifest_version are always relevant,
  // if an error has been collected for it then it is because the
  // addon manifest_version is outside or the allowed range.
  if (error.instancePath === '/manifest_version') {
    return true;
  }

  const { minimum, maximum } = allowedManifestVersionsRange;

  let errorMinManifestVersion =
    error.params?.min_manifest_version ??
    error.parentSchema?.min_manifest_version ??
    minimum;

  const errorMaxManifestVersion =
    error.params?.max_manifest_version ??
    error.parentSchema?.max_manifest_version ??
    maximum;

  // Make sure the computed error max version is always >= to the computed min version.
  errorMinManifestVersion = Math.min(
    errorMinManifestVersion,
    errorMaxManifestVersion
  );

  const isTopLevelManifestKey =
    error.instancePath.split('/').filter((s) => s.length).length === 1;
  const errorFromAnyOf = error.schemaPath.includes('/anyOf/');
  // Skip the error if it is not in range, only when the error is:
  //
  // - not related to a top level manifest key (e.g. we still want to have a linting error
  //   if "action" or "browser_action" is being used in the wrong manifest version)
  //
  // - or part of a group of anyOf schema definitions (e.g. we don't need the errors related to
  //   web_accessible_resources schema definition that is only valid on a certain manifest
  //   version).
  const skipIfNotInRange = !isTopLevelManifestKey || errorFromAnyOf;

  // Omit errors related to a schema fragment that are not relevant
  // for the given manifest version (and also if its parent schema
  // is not relevant for the given manifest version), but only if
  // the manifest key nesting level is > 1 (so that we still include
  // errors related to top level manifest keys that are only supported
  // in specific manifest versions)
  if (
    skipIfNotInRange &&
    (manifest_version < errorMinManifestVersion ||
      manifest_version > errorMaxManifestVersion)
  ) {
    return false;
  }

  // An error collected by an `anyOf` schema entry is relevant only if its the schema
  // entries are relevant for the given addon manifest_version.
  if (error.keyword === 'anyOf') {
    const anyOfSchemaEntries = error.schema?.filter((schema) => {
      const min = schema.min_manifest_version ?? minimum;
      const max = schema.max_manifest_version ?? maximum;

      return manifest_version >= min && manifest_version <= max;
    });

    // The error is irrelevant if:
    // - there is no anyOf entry that is relevant for the given addon manifest_version
    // - there is only one relevant entry (in that case an error for that entry would
    //   have been already collected and there is no need to report it again as part
    //   of the error collected by anyOf.
    if (anyOfSchemaEntries?.length <= 1) {
      return false;
    }
  }

  return true;
}

function filterErrors(
  errors,
  { manifest_version, allowedManifestVersionsRange } = {}
) {
  if (!errors) {
    return errors;
  }

  let filteredErrors = errors.filter((error) => {
    return error.keyword !== '$merge';
  });

  // Filter out errors that are not relevant for the addon manifest_version,
  // this means that:
  //
  // - for mv2 addons, the errors related to schema only supported in mv3 will not be reported
  // - similarly for mv3 addons, errors related to schema only supported in mv2 will not be reported
  //
  // This should help to avoid to report too many validation errors and to ensure that the
  // validation errors reported are all relevant for the manifest_version actually set on
  // the extension.
  if (
    filteredErrors.length > 0 &&
    typeof manifest_version === 'number' &&
    allowedManifestVersionsRange
  ) {
    filteredErrors = filteredErrors.filter((error) =>
      isRelevantError({ error, manifest_version, allowedManifestVersionsRange })
    );
  }

  return filteredErrors;
}

function getManifestVersionsRange(validatorOptions) {
  const { minManifestVersion, maxManifestVersion } = validatorOptions;

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
  if (minimum > maximum) {
    throw new Error(
      `Invalid manifest version range requested: ${JSON.stringify({
        maximum,
        minimum,
      })}`
    );
  }

  return { minimum, maximum };
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
   *   from `schema/i18n_messages`.
   */
  constructor(validatorOptions) {
    this._options = validatorOptions;
    this.allowedManifestVersionsRange =
      getManifestVersionsRange(validatorOptions);

    const validator = new Ajv({
      strict: false,
      allErrors: true,
      // include schema and data properties in error objects.
      verbose: true,
    });

    for (const schema of Object.values(this.schemas)) {
      validator.addSchema(schema);
    }
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
      const { _validator } = this;
      this._addonValidator = this._compileAddonValidator(_validator);
    }

    return this._addonValidator;
  }

  get addonManifestVersion() {
    // Fallback to the lower allowed manifest version if there isn't
    // a numeric manifest_version value in the manifest.
    if (typeof this._options?.addonManifestVersion !== 'number') {
      return this.allowedManifestVersionsRange.minimum;
    }
    return this._options.addonManifestVersion;
  }

  get isPrivilegedAddon() {
    return this._options?.privileged ?? false;
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
        $id: 'static-theme-manifest',
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
        $id: 'langpack-manifest',
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
        $id: 'dictionary-manifest',
        $ref: '#/types/WebExtensionDictionaryManifest',
      });
    }

    return this._dictionaryValidator;
  }

  get validateLocale() {
    if (!this._localeValidator) {
      this._localeValidator = this._validator.compile({
        ...this.messagesSchemaObject,
        $id: 'i18nMessages',
        $ref: '#/types/WebExtensionI18nMessages',
      });
    }

    return this._localeValidator;
  }

  _compileAddonValidator(validator) {
    const { minimum, maximum } = this.allowedManifestVersionsRange;
    const manifestVersion = this.addonManifestVersion;

    const replacer = (key, value) => {
      if (Array.isArray(value)) {
        const patchedValue = value.filter((item) => {
          let includeItem = true;
          if (
            item?.min_manifest_version &&
            minimum < item.min_manifest_version
          ) {
            includeItem =
              item.min_manifest_version >= minimum &&
              item.min_manifest_version <= maximum &&
              item.min_manifest_version <= manifestVersion;
          }
          if (
            item?.max_manifest_version &&
            maximum > item.max_manifest_version
          ) {
            includeItem =
              item.max_manifest_version >= minimum &&
              item.max_manifest_version <= maximum &&
              item.max_manifest_version >= manifestVersion;
          }

          return includeItem;
        });
        return patchedValue;
      }
      return value;
    };

    // Omit from the manifest schema data all entries that include a
    // min/max_manifest_version which is outside of the minimum
    // and maximum manifest_version currently allowed per validator
    // config and if they do not apply to the addon manifest_version.
    //
    // NOTE: the rest of the schema data isn't filtered based on the
    // current manifest version.
    //
    // TODO(https://github.com/mozilla/addons-linter/issues/4512):
    // this shouldn't be necessary anymore if we do generate two sets
    // of schema data (one for MV2 and one for MV3) as part of
    // importing and normalizing the JSONSchema data from Firefox.
    const patchedSchemaObject = JSON.parse(
      JSON.stringify(this.schemaObject, replacer, 2)
    );

    const schemaData = deepPatch(patchedSchemaObject, {
      types: {
        ManifestBase: {
          properties: {
            manifest_version: {
              minimum,
              maximum,
            },
          },
        },
      },
    });

    return validator.compile({
      ...schemaData,
      $id: 'manifest',
      $ref: '#/types/WebExtensionManifest',
    });
  }

  _addCustomFormats(validator) {
    // This check is implemented in the ManifestJSONParser.
    validator.addFormat('versionString', () => true);
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
    validator.addFormat('origin', isOrigin);

    validator.addFormat(
      'imageDataOrStrictRelativeUrl',
      imageDataOrStrictRelativeUrl
    );
  }

  _addCustomKeywords(validator) {
    validator.removeKeyword(SCHEMA_KEYWORDS.DEPRECATED);
    validator.addKeyword({
      keyword: SCHEMA_KEYWORDS.DEPRECATED,
      validate: function validateDeprecated(
        message,
        propValue,
        schema,
        { instancePath }
      ) {
        if (
          !Object.prototype.hasOwnProperty.call(
            DEPRECATED_MANIFEST_PROPERTIES,
            instancePath
          )
        ) {
          // Do not emit errors for every deprecated property, as it may introduce
          // regressions due to unexpected new deprecation messages raised as errors,
          // better to deal with it separately.
          return true;
        }

        validateDeprecated.errors = [
          {
            keyword: SCHEMA_KEYWORDS.DEPRECATED,
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
        { rootData /* instancePath, parentData, parentDataProperty, */ }
      ) {
        const manifestVersion =
          (rootData && rootData.manifest_version) || MANIFEST_VERSION_DEFAULT;
        const res = condFn(keywordSchemaValue, manifestVersion);

        // If the min/max_manifest_version is set on a schema entry of type array,
        // propagate the same keyword to the `items` schema, which is needed to
        // - be able to recognize that those schema entries are also only allowed on
        //   certain manifest versions (which becomes part of the linting messages)
        // - be able to filter out the validation errors related to future (not yet
        //   supported) manifest versions if they are related to those schema entries
        //   (which happens based on the current or parent schema in the `filterErrors`
        //   helper method).
        if (schema.type === 'array') {
          // TODO(#3774): move this at "import JSONSchema data" time, and remove it from here.
          // eslint-disable-next-line no-param-reassign
          schema.items[keyword] = schema[keyword];
        }

        if (!res) {
          // If the addon manifest is out of an enum values min/max manifest version range,
          // don't report an additional validation error for the min/max_manifest_version
          // keyword validation function.
          if (schema.enum) {
            return true;
          }
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

    validator.addKeyword({
      keyword: SCHEMA_KEYWORDS.MAX_MANIFEST_VERSION,
      // function of type SchemaValidateFunction (see ajv typescript signatures).
      validate: createManifestVersionValidateFn(
        SCHEMA_KEYWORDS.MAX_MANIFEST_VERSION,
        (maxMV, manifestVersion) => maxMV >= manifestVersion
      ),
      errors: true,
    });

    validator.addKeyword({
      keyword: SCHEMA_KEYWORDS.MIN_MANIFEST_VERSION,
      validate: createManifestVersionValidateFn(
        SCHEMA_KEYWORDS.MIN_MANIFEST_VERSION,
        (minMV, manifestVersion) => minMV <= manifestVersion
      ),
      errors: true,
    });

    const validatePrivilegedPermissions = (keywordSchemaValue, propValue) => {
      const privilegedPermissions = this.getPrivilegedPermissionsSet(validator);
      const found = new Set();

      for (const permission of propValue) {
        if (privilegedPermissions.has(permission)) {
          found.add(permission);
        }
      }

      const hasMozillaAddonsPermission = found.has('mozillaAddons');

      // If the addon is expected to be privileged, we report a linting error if:
      // - there are no privileged permissions required
      // - and/or if the "mozillaAddons" permission isn't requested (which is going
      //   to be a mandatory requirement even if there are also other privileged
      //   permissions already required).
      if (this.isPrivilegedAddon) {
        if (found.size === 0 || !hasMozillaAddonsPermission) {
          validatePrivilegedPermissions.errors = [
            {
              keyword: SCHEMA_KEYWORDS.VALIDATE_PRIVILEGED_PERMISSIONS,
              params: {
                postprocess: keywordSchemaValue,
                privilegedPermissions: Array.from(found),
                hasMozillaAddonsPermission,
              },
            },
          ];

          return false;
        }

        return true;
      }

      if (found.size > 0) {
        validatePrivilegedPermissions.errors = [
          {
            keyword: SCHEMA_KEYWORDS.VALIDATE_PRIVILEGED_PERMISSIONS,
            params: {
              postprocess: keywordSchemaValue,
              privilegedPermissions: Array.from(found),
              hasMozillaAddonsPermission: found.has('mozillaAddons'),
            },
          },
        ];
        return false;
      }

      return true;
    };

    validator.addKeyword({
      keyword: SCHEMA_KEYWORDS.VALIDATE_PRIVILEGED_PERMISSIONS,
      validate: validatePrivilegedPermissions,
    });

    const validatePrivilegedManifestFields = (
      keywordSchemaValue,
      propValue,
      schema,
      { rootData /* instancePath, parentData, parentDataProperty, */ }
    ) => {
      const hasMozillaAddonsPermission =
        Array.isArray(rootData.permissions) &&
        rootData.permissions.includes('mozillaAddons');

      if (this.isPrivilegedAddon) {
        if (!hasMozillaAddonsPermission) {
          validatePrivilegedManifestFields.errors = [
            {
              keyword: SCHEMA_KEYWORDS.PRIVILEGED,
              params: {
                hasMozillaAddonsPermission,
              },
            },
          ];
          return false;
        }
        return true;
      }

      validatePrivilegedManifestFields.errors = [
        {
          keyword: SCHEMA_KEYWORDS.PRIVILEGED,
          params: {
            hasMozillaAddonsPermission,
          },
        },
      ];
      return false;
    };

    validator.addKeyword({
      keyword: SCHEMA_KEYWORDS.PRIVILEGED,
      validate: validatePrivilegedManifestFields,
    });
  }

  getPrivilegedPermissionsSet(validator) {
    const schemaManifest = validator.getSchema('manifest').schema;
    const schemaPermissionPrivileged =
      schemaManifest.types.PermissionPrivileged.anyOf;

    const results = new Set();
    for (const schemaPermission of schemaPermissionPrivileged) {
      const { type, $ref } = schemaPermission;
      if (type === 'string' && schemaPermission.enum) {
        schemaPermission.enum.forEach((str) => results.add(str));
      } else if ($ref) {
        const [namespace] = $ref.split('#');
        const schemaNamespace = validator.getSchema(namespace).schema;
        schemaNamespace.permissions.forEach((str) => results.add(str));
      }
    }
    if (results.size === 0) {
      throw new Error(
        'Unable to retrieve the Privileged Permissions set from the schema data'
      );
    }
    return results;
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
  const validator =
    validatorOptions.validator ??
    getValidator({
      ...validatorOptions,
      addonManifestVersion: manifestData?.manifest_version,
    });
  let isValid = validator.validateAddon(manifestData);
  const errors = filterErrors(validator.validateAddon.errors, {
    manifest_version: manifestData.manifest_version,
    allowedManifestVersionsRange: validator.allowedManifestVersionsRange,
  });
  isValid = errors?.length > 0 ? isValid : true;
  validateAddon.errors = errors;

  return isValid;
};

export const validateStaticTheme = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  let isValid = validator.validateStaticTheme(manifestData);
  const errors = filterErrors(validator.validateStaticTheme.errors);
  isValid = errors?.length > 0 ? isValid : true;
  validateStaticTheme.errors = errors;
  return isValid;
};

export const validateLangPack = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  let isValid = validator.validateLangPack(manifestData);
  const errors = filterErrors(validator.validateLangPack.errors);
  isValid = errors?.length > 0 ? isValid : true;
  validateLangPack.errors = errors;
  return isValid;
};

export const validateDictionary = (manifestData, validatorOptions = {}) => {
  const validator = getValidator(validatorOptions);
  let isValid = validator.validateDictionary(manifestData);
  const errors = filterErrors(validator.validateDictionary.errors);
  isValid = errors?.length > 0 ? isValid : true;
  validateDictionary.errors = errors;
  return isValid;
};

export const validateLocaleMessages = (
  localeMessagesData,
  validatorOptions = {}
) => {
  const validator = getValidator(validatorOptions);
  let isValid = validator.validateLocale(localeMessagesData);
  const errors = filterErrors(validator.validateLocale.errors);
  isValid = errors?.length > 0 ? isValid : true;
  validateLocaleMessages.errors = errors;
  return isValid;
};
