/* eslint-disable import/namespace */
import path from 'path';

import RJSON from '@fregante/relaxed-json';
import { oneLine } from 'common-tags';
import getImageSize from 'image-size';
import upath from 'upath';
import bcd from '@mdn/browser-compat-data';
import { mozCompare } from 'addons-moz-compare';

import { getDefaultConfigValue } from 'yargs-options';
import {
  validateAddon,
  validateDictionary,
  validateLangPack,
  validateStaticTheme,
} from 'schema/validator';
import {
  CSP_KEYWORD_RE,
  DEPRECATED_MANIFEST_PROPERTIES,
  FILE_EXTENSIONS_TO_MIME,
  IMAGE_FILE_EXTENSIONS,
  INSTALL_ORIGINS_DATAPATH_REGEX,
  MANIFEST_JSON,
  MESSAGES_JSON,
  LOCALES_DIRECTORY,
  PACKAGE_EXTENSION,
  PERMS_DATAPATH_REGEX,
  RESTRICTED_HOMEPAGE_URLS,
  RESTRICTED_PERMISSIONS,
  SCHEMA_KEYWORDS,
  STATIC_THEME_IMAGE_MIMES,
} from 'const';
import log from 'logger';
import * as messages from 'messages';
import JSONParser from 'parsers/json';
import {
  androidStrictMinVersion,
  basicCompatVersionComparison,
  firefoxStrictMinVersion,
  firstStableVersion,
  isToolkitVersionString,
  isValidVersionString,
  normalizePath,
  parseCspPolicy,
} from 'utils';
import BLOCKED_CONTENT_SCRIPT_HOSTS from 'blocked_content_script_hosts.txt';

async function getStreamImageSize(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    try {
      return getImageSize(Buffer.concat(chunks));
    } catch {
      /* The size information isn't available yet */
    }
  }

  return getImageSize(Buffer.concat(chunks));
}

async function getImageMetadata(io, iconPath) {
  // Get a non-utf8 input stream by setting encoding to null.
  let encoding = null;

  if (iconPath.endsWith('.svg')) {
    encoding = 'utf-8';
  }

  const fileStream = await io.getFileAsStream(iconPath, { encoding });

  const data = await getStreamImageSize(fileStream);

  return {
    width: data.width,
    height: data.height,
    mime: FILE_EXTENSIONS_TO_MIME[data.type],
  };
}

function getNormalizedExtension(_path) {
  return path.extname(_path).substring(1).toLowerCase();
}

export default class ManifestJSONParser extends JSONParser {
  constructor(
    jsonString,
    collector,
    {
      filename = MANIFEST_JSON,
      RelaxedJSON = RJSON,
      selfHosted = getDefaultConfigValue('self-hosted'),
      schemaValidatorOptions,
      io = null,
      isAlreadySigned = false,
      isEnterprise = getDefaultConfigValue('enterprise'),
      restrictedPermissions = RESTRICTED_PERMISSIONS,
    } = {}
  ) {
    super(jsonString, collector, { filename });

    this.parse(RelaxedJSON);

    // Set up some defaults in case parsing fails.
    if (typeof this.parsedJSON === 'undefined' || this.isValid === false) {
      this.parsedJSON = {
        manifest_version: null,
        name: null,
        type: PACKAGE_EXTENSION,
        version: null,
      };
    } else {
      // We've parsed the JSON; now we can validate the manifest.

      // --enterprise implies --self-hosted since we cannot host enterprise
      // add-ons on AMO.
      this.selfHosted = selfHosted || isEnterprise;
      this.schemaValidatorOptions = schemaValidatorOptions;

      const hasManifestKey = (key) =>
        Object.prototype.hasOwnProperty.call(this.parsedJSON, key);

      this.isStaticTheme = false;
      this.isLanguagePack = false;
      this.isDictionary = false;

      // Keep the addon type detection in sync with the most updated logic
      // used on the Firefox side, as defined in ExtensionData parseManifest
      // method.
      if (hasManifestKey('theme')) {
        this.isStaticTheme = true;
      } else if (hasManifestKey('langpack_id')) {
        this.isLanguagePack = true;
      } else if (hasManifestKey('dictionaries')) {
        this.isDictionary = true;
      }

      this.io = io;
      this.isAlreadySigned = isAlreadySigned;
      this.isEnterpriseAddon = isEnterprise;
      this.isPrivilegedAddon = this.schemaValidatorOptions?.privileged ?? false;
      this.restrictedPermissions = restrictedPermissions;
      this._validate();
    }
  }

  checkKeySupport(
    support,
    minFirefoxVersion,
    minAndroidVersion,
    key,
    isPermission = false
  ) {
    if (support.firefox && minFirefoxVersion) {
      // We don't have to support gaps in the `@mdn/browser-compat-data`
      // information for Firefox Desktop so far.
      const versionAdded = support.firefox.version_added;
      if (basicCompatVersionComparison(versionAdded, minFirefoxVersion)) {
        if (!isPermission) {
          this.collector.addWarning(
            messages.keyFirefoxUnsupportedByMinVersion(
              key,
              minFirefoxVersion,
              versionAdded
            )
          );
        } else {
          this.collector.addNotice(
            messages.permissionFirefoxUnsupportedByMinVersion(
              key,
              minFirefoxVersion,
              versionAdded
            )
          );
        }
      }
    }

    if (support.firefox_android && minAndroidVersion) {
      // `@mdn/browser-compat-data` sometimes provides data with gaps, e.g., a
      // feature was supported in Fennec (added in 56 and removed in 79) and
      // then re-added in Fenix (added in 85) and this is expressed with an
      // array of objects instead of a single object.
      //
      // This is the case of the `permissions.browsingData` on Android for
      // instance and we decided to only warn the developer if the minVersion
      // required by the extension is not greater or equal of the first version
      // where the feature was officially supported for the first time (and do
      // not warn if the minVersion is in one of the few version gaps).
      const versionAddedAndroid = firstStableVersion(support.firefox_android);

      if (
        basicCompatVersionComparison(versionAddedAndroid, minAndroidVersion)
      ) {
        if (!isPermission) {
          this.collector.addWarning(
            messages.keyFirefoxAndroidUnsupportedByMinVersion(
              key,
              minAndroidVersion,
              versionAddedAndroid
            )
          );
        } else {
          this.collector.addNotice(
            messages.permissionFirefoxAndroidUnsupportedByMinVersion(
              key,
              minAndroidVersion,
              versionAddedAndroid
            )
          );
        }
      }
    }
  }

  checkCompatInfo(
    compatInfo,
    minFirefoxVersion,
    minAndroidVersion,
    key,
    manifestKeyValue
  ) {
    for (const subkey in compatInfo) {
      if (Object.prototype.hasOwnProperty.call(compatInfo, subkey)) {
        const subkeyInfo = compatInfo[subkey];
        if (subkey === '__compat') {
          this.checkKeySupport(
            subkeyInfo.support,
            minFirefoxVersion,
            minAndroidVersion,
            key
          );
        } else if (
          typeof manifestKeyValue === 'object' &&
          manifestKeyValue !== null &&
          Object.prototype.hasOwnProperty.call(manifestKeyValue, subkey)
        ) {
          this.checkCompatInfo(
            subkeyInfo,
            minFirefoxVersion,
            minAndroidVersion,
            `${key}.${subkey}`,
            manifestKeyValue[subkey]
          );
        } else if (
          (key === 'permissions' || key === 'optional_permissions') &&
          manifestKeyValue.includes(subkey)
        ) {
          this.checkKeySupport(
            subkeyInfo.__compat.support,
            minFirefoxVersion,
            minAndroidVersion,
            `${key}:${subkey}`,
            true
          );
        }
      }
    }
  }

  errorLookup(error) {
    // This is the default message.
    let baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      const lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'must match a schema in anyof') {
        // eslint-disable-next-line no-param-reassign
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    const overrides = {
      message: `"${error.instancePath || '/'}" ${error.message}`,
      instancePath: error.instancePath,
    };

    if (error.keyword === SCHEMA_KEYWORDS.REQUIRED) {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.keyword === SCHEMA_KEYWORDS.DEPRECATED) {
      if (
        Object.prototype.hasOwnProperty.call(
          DEPRECATED_MANIFEST_PROPERTIES,
          error.instancePath
        )
      ) {
        baseObject =
          messages[DEPRECATED_MANIFEST_PROPERTIES[error.instancePath]];

        if (baseObject === null) {
          baseObject = messages.MANIFEST_FIELD_DEPRECATED;
        }

        let errorDescription = baseObject.description;

        if (errorDescription === null) {
          errorDescription = error.message;
        }

        // Set the description to the actual message from the schema
        overrides.message = baseObject.message;
        overrides.description = errorDescription;
      }
      // TODO(#2462): add a messages.MANIFEST_FIELD_DEPRECATED and ensure that deprecated
      // properties are handled properly (e.g. we should also detect when the deprecated
      // keyword is actually used to warn the developer of additional properties not
      // explicitly defined in the schemas).
    } else if (
      error.keyword === SCHEMA_KEYWORDS.MIN_MANIFEST_VERSION ||
      error.keyword === SCHEMA_KEYWORDS.MAX_MANIFEST_VERSION
    ) {
      // Choose a different message for permissions unsupported with the
      // add-on manifest_version.
      if (PERMS_DATAPATH_REGEX.test(error.instancePath)) {
        baseObject = messages.manifestPermissionUnsupported(error.data, error);
      } else if (error.instancePath === '/applications') {
        baseObject = messages.APPLICATIONS_INVALID;
      } else {
        baseObject = messages.manifestFieldUnsupported(
          error.instancePath,
          error
        );
      }

      // Set the message and description from the one generated by the
      // choosen message.
      overrides.message = baseObject.message;
      overrides.description = baseObject.description;
    } else if (
      error.instancePath.startsWith('/permissions') &&
      error.keyword === SCHEMA_KEYWORDS.VALIDATE_PRIVILEGED_PERMISSIONS &&
      error.params.privilegedPermissions
    ) {
      if (this.isPrivilegedAddon) {
        baseObject = error.params.privilegedPermissions.length
          ? messages.mozillaAddonsPermissionRequired(error)
          : messages.privilegedFeaturesRequired(error);
      } else {
        baseObject = messages.manifestPermissionsPrivileged(error);
      }
      overrides.message = baseObject.message;
      overrides.description = baseObject.description;
    } else if (
      error.instancePath.startsWith('/permissions') &&
      typeof error.data !== 'undefined' &&
      typeof error.data !== 'string'
    ) {
      baseObject = messages.MANIFEST_BAD_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (
      error.instancePath.startsWith('/optional_permissions') &&
      typeof error.data !== 'undefined' &&
      typeof error.data !== 'string'
    ) {
      baseObject = messages.MANIFEST_BAD_OPTIONAL_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (
      error.instancePath.startsWith('/host_permissions') &&
      typeof error.data !== 'undefined' &&
      typeof error.data !== 'string'
    ) {
      baseObject = messages.MANIFEST_BAD_HOST_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (error.keyword === SCHEMA_KEYWORDS.TYPE) {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    } else if (error.keyword === SCHEMA_KEYWORDS.PRIVILEGED) {
      baseObject = this.isPrivilegedAddon
        ? messages.mozillaAddonsPermissionRequired(error)
        : messages.manifestFieldPrivileged(error);
      overrides.message = baseObject.message;
      overrides.description = baseObject.description;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    // Note that this works because the 2 regexps use similar patterns. We'll
    // want to adjust this if they start to differ.
    const match =
      error.instancePath.match(PERMS_DATAPATH_REGEX) ||
      error.instancePath.match(INSTALL_ORIGINS_DATAPATH_REGEX);

    if (
      match &&
      baseObject.code !== messages.MANIFEST_BAD_PERMISSION.code &&
      baseObject.code !== messages.MANIFEST_BAD_OPTIONAL_PERMISSION.code &&
      baseObject.code !== messages.MANIFEST_BAD_HOST_PERMISSION.code &&
      baseObject.code !== messages.MANIFEST_PERMISSION_UNSUPPORTED
    ) {
      baseObject = messages[`MANIFEST_${match[1].toUpperCase()}`];
      overrides.message = oneLine`/${match[1]}: Invalid ${match[1]}
          "${error.data}" at ${match[2]}.`;
    }

    // Make sure we filter out warnings and errors code that should never be reported
    // on manifest version 2 extensions.
    const ignoredOnMV2 = [
      messages.MANIFEST_HOST_PERMISSIONS.code,
      messages.MANIFEST_BAD_HOST_PERMISSION.code,
    ];

    if (
      this.parsedJSON.manifest_version === 2 &&
      ignoredOnMV2.includes(baseObject.code)
    ) {
      return null;
    }

    return { ...baseObject, ...overrides };
  }

  _validate() {
    // Not all messages returned by the schema are fatal to Firefox, messages
    // that are just warnings should be added to this array.
    const warnings = [
      messages.MANIFEST_PERMISSIONS.code,
      messages.MANIFEST_OPTIONAL_PERMISSIONS.code,
      messages.MANIFEST_HOST_PERMISSIONS.code,
      messages.MANIFEST_PERMISSION_UNSUPPORTED,
      messages.MANIFEST_FIELD_UNSUPPORTED,
    ];

    // Message with the following codes will be:
    //
    // - omitted if the add-on is being explicitly validated as privileged
    //   when the `--privileged` cli option was passed or `privileged` is
    //   set to true in the linter config. This is the case for privileged
    //   extensions in the https://github.com/mozilla-extensions/ org.
    //
    // - reported as warnings if the add-on is already signed
    //   (because it is expected for addons signed as privileged to be
    //   submitted to AMO to become listed, and so the warning is meant to
    //   be just informative and to let extension developers and reviewers
    //   to know that the extension is expected to be signed as privileged
    //   or it wouldn't work).
    //
    // - reported as errors if the add-on isn't signed, which should
    //   reject the submission of a privileged extension on AMO (and
    //   have it signed with a non privileged certificate by mistake).
    const privilegedManifestMessages = [
      messages.MANIFEST_PERMISSIONS_PRIVILEGED,
      messages.MANIFEST_FIELD_PRIVILEGED,
    ];

    if (this.isAlreadySigned) {
      warnings.push(...privilegedManifestMessages);
    }

    let validate = validateAddon;

    if (this.isStaticTheme) {
      validate = validateStaticTheme;
    } else if (this.isLanguagePack) {
      validate = validateLangPack;
    } else if (this.isDictionary) {
      validate = validateDictionary;
    }

    this.isValid = validate(this.parsedJSON, this.schemaValidatorOptions);

    if (!this.isValid) {
      log.debug(
        'Schema Validation messages',
        JSON.stringify(validate.errors, null, 2)
      );

      validate.errors.forEach((error) => {
        const message = this.errorLookup(error);

        // errorLookup call returned a null or undefined message,
        // and so the error should be ignored.
        if (!message) {
          return;
        }

        if (warnings.includes(message.code)) {
          this.collector.addWarning(message);
        } else {
          this.collector.addError(message);
        }

        // Add-ons with bad permissions will fail to install in Firefox, so
        // we consider them invalid.
        if (message.code === messages.MANIFEST_BAD_PERMISSION.code) {
          this.isValid = false;
        }
      });
    }

    if (this.parsedJSON.applications?.gecko_android) {
      this.collector.addError(
        messages.manifestFieldUnsupported('/applications/gecko_android')
      );
      this.isValid = false;
    }

    if (this.parsedJSON.manifest_version < 3) {
      if (
        this.parsedJSON.browser_specific_settings?.gecko &&
        this.parsedJSON.applications
      ) {
        this.collector.addWarning(messages.IGNORED_APPLICATIONS_PROPERTY);
      } else if (this.parsedJSON.applications) {
        this.collector.addWarning(messages.APPLICATIONS_DEPRECATED);
      }
    }

    if (
      this.parsedJSON.browser_specific_settings &&
      (this.parsedJSON.browser_specific_settings.gecko ||
        this.parsedJSON.browser_specific_settings.gecko_android)
    ) {
      this.parsedJSON.applications = {
        ...(this.parsedJSON.applications || {}),
        ...this.parsedJSON.browser_specific_settings,
      };
    }

    // We only want `admin_install_only` to be set in `bss` when `--enterprise`
    // is set, otherwise we don't want the flag _at all_, which includes both
    // `bss` and `applications`.
    if (this.isEnterpriseAddon) {
      if (
        this.parsedJSON.browser_specific_settings?.gecko?.admin_install_only !==
        true
      ) {
        this.collector.addError(messages.ADMIN_INSTALL_ONLY_REQUIRED);
        this.isValid = false;
      }
    } else if (
      typeof this.parsedJSON.applications?.gecko?.admin_install_only !==
      'undefined'
    ) {
      this.collector.addError(messages.ADMIN_INSTALL_ONLY_PROP_RESERVED);
      this.isValid = false;
    }

    if (this.schemaValidatorOptions?.enableDataCollectionPermissions) {
      this.validateDataCollectionPermissions(
        this.parsedJSON.browser_specific_settings?.gecko
          ?.data_collection_permissions
      );
    } else if (
      this.parsedJSON.browser_specific_settings?.gecko
        ?.data_collection_permissions
    ) {
      this.collector.addError(
        messages.DATA_COLLECTION_PERMISSIONS_PROP_RESERVED
      );
      this.isValid = false;
    }

    if (this.parsedJSON.content_security_policy != null) {
      this.validateCspPolicy(this.parsedJSON.content_security_policy);
    }

    if (this.parsedJSON.update_url) {
      this.collector.addNotice(messages.MANIFEST_UNUSED_UPDATE);
    }

    if (this.parsedJSON.granted_host_permissions) {
      this.collector.addWarning(
        messages.manifestFieldPrivilegedOnly('granted_host_permissions')
      );
    }

    if (this.parsedJSON.background) {
      const hasScripts = Array.isArray(this.parsedJSON.background.scripts);
      if (hasScripts) {
        this.parsedJSON.background.scripts.forEach((script) => {
          this.validateFileExistsInPackage(script, 'script');
        });
      }

      const hasPage = !!this.parsedJSON.background.page;
      if (hasPage) {
        this.validateFileExistsInPackage(
          this.parsedJSON.background.page,
          'page'
        );
      }

      if (this.parsedJSON.background.service_worker) {
        if (!this.schemaValidatorOptions?.enableBackgroundServiceWorker) {
          // Report an error and mark the manifest as invalid if background
          // service worker support isn't enabled by the addons-linter feature
          // flag.
          if (hasScripts || hasPage) {
            this.collector.addWarning(
              messages.manifestFieldUnsupported('/background/service_worker')
            );
          } else {
            this.collector.addError(
              messages.manifestFieldUnsupported('/background/service_worker')
            );
            this.isValid = false;
          }
        } else if (this.parsedJSON.manifest_version >= 3) {
          this.validateFileExistsInPackage(
            this.parsedJSON.background.service_worker,
            'script'
          );
        }
      }
    }

    if (
      this.parsedJSON.content_scripts &&
      this.parsedJSON.content_scripts.length
    ) {
      this.parsedJSON.content_scripts.forEach((scriptRule) => {
        if (scriptRule.matches && scriptRule.matches.length) {
          // Since `include_globs` only get's checked for patterns that are in
          // `matches` we only need to validate `matches`
          scriptRule.matches.forEach((matchPattern) => {
            this.validateContentScriptMatchPattern(matchPattern);
          });
        }

        if (scriptRule.js && scriptRule.js.length) {
          scriptRule.js.forEach((script) => {
            this.validateFileExistsInPackage(
              script,
              'script',
              messages.manifestContentScriptFileMissing
            );
          });
        }
        if (scriptRule.css && scriptRule.css.length) {
          scriptRule.css.forEach((style) => {
            this.validateFileExistsInPackage(
              style,
              'css',
              messages.manifestContentScriptFileMissing
            );
          });
        }
      });
    }

    if (this.parsedJSON.dictionaries) {
      if (!this.getAddonId()) {
        this.collector.addError(messages.MANIFEST_DICT_MISSING_ID);
        this.isValid = false;
      }
      const numberOfDictionaries = Object.keys(
        this.parsedJSON.dictionaries
      ).length;
      if (numberOfDictionaries < 1) {
        this.collector.addError(messages.MANIFEST_EMPTY_DICTS);
        this.isValid = false;
      } else if (numberOfDictionaries > 1) {
        this.collector.addError(messages.MANIFEST_MULTIPLE_DICTS);
        this.isValid = false;
      }
      Object.keys(this.parsedJSON.dictionaries).forEach((locale) => {
        const filepath = this.parsedJSON.dictionaries[locale];
        this.validateFileExistsInPackage(
          filepath,
          'binary',
          messages.manifestDictionaryFileMissing
        );
        // A corresponding .aff file should exist for every .dic.
        this.validateFileExistsInPackage(
          filepath.replace(/\.dic$/, '.aff'),
          'binary',
          messages.manifestDictionaryFileMissing
        );
      });
    }

    if (
      (!this.selfHosted || this.isEnterpriseAddon) &&
      this.parsedJSON.applications?.gecko?.update_url
    ) {
      if (this.isPrivilegedAddon) {
        // We cannot know whether a privileged add-on will be listed or
        // unlisted so we only emit a warning for MANIFEST_UPDATE_URL (not an
        // error).
        this.collector.addWarning(messages.MANIFEST_UPDATE_URL);
      } else {
        this.collector.addError(messages.MANIFEST_UPDATE_URL);
        this.isValid = false;
      }
    }

    if (
      !this.isLanguagePack &&
      (this.parsedJSON.applications?.gecko?.strict_max_version ||
        this.parsedJSON.applications?.gecko_android?.strict_max_version)
    ) {
      if (this.isDictionary) {
        // Dictionaries should not have a strict_max_version at all.
        this.isValid = false;
        this.collector.addError(messages.STRICT_MAX_VERSION);
      } else {
        // Rest of the extensions can, even though it's not recommended.
        this.collector.addNotice(messages.STRICT_MAX_VERSION);
      }
    }

    const minFirefoxVersion = firefoxStrictMinVersion(this.parsedJSON);
    const minAndroidVersion = androidStrictMinVersion(this.parsedJSON);
    if (
      !this.isLanguagePack &&
      !this.isDictionary &&
      (minFirefoxVersion || minAndroidVersion)
    ) {
      for (const key in bcd.webextensions.manifest) {
        if (Object.prototype.hasOwnProperty.call(this.parsedJSON, key)) {
          const compatInfo = bcd.webextensions.manifest[key];
          this.checkCompatInfo(
            compatInfo,
            minFirefoxVersion,
            minAndroidVersion,
            key,
            this.parsedJSON[key]
          );
        }
      }
    }

    this.validateName();
    this.validateVersionString();

    if (this.parsedJSON.default_locale) {
      const msg = path.join(
        LOCALES_DIRECTORY,
        this.parsedJSON.default_locale,
        'messages.json'
      );

      // Convert filename to unix path separator before
      // searching it into the scanned files map.
      if (!this.io.files[upath.toUnix(msg)]) {
        this.collector.addError(messages.NO_MESSAGES_FILE);
        this.isValid = false;
      }
    }

    if (this?.io?.files) {
      const fileList = Object.keys(this.io.files);
      const localeDirRe = new RegExp(`^${LOCALES_DIRECTORY}/(.*?)/`);
      const localeFileRe = new RegExp(
        `^${LOCALES_DIRECTORY}/.*?/${MESSAGES_JSON}$`
      );

      const locales = [];
      const localesWithMessagesJson = [];
      const errors = [];

      // Collect distinct locales (based on the content of `_locales/`) as
      // well as the locales for which we have a `messages.json` file.
      for (let i = 0; i < fileList.length; i++) {
        const matches = fileList[i].match(localeDirRe);

        if (matches && !locales.includes(matches[1])) {
          locales.push(matches[1]);
        }

        if (matches && fileList[i].match(localeFileRe)) {
          localesWithMessagesJson.push(matches[1]);
        }
      }

      // Emit an error for each locale without a `messages.json` file.
      for (let i = 0; i < locales.length; i++) {
        if (!localesWithMessagesJson.includes(locales[i])) {
          errors.push(
            messages.noMessagesFileInLocales(
              path.join(LOCALES_DIRECTORY, locales[i])
            )
          );
        }
      }

      // When there is no default locale, we do not want to emit errors for
      // missing locale files because we ignore those files.
      if (!this.parsedJSON.default_locale) {
        if (localesWithMessagesJson.length) {
          this.collector.addError(messages.NO_DEFAULT_LOCALE);
          this.isValid = false;
        }
      } else if (errors.length > 0) {
        for (const error of errors) {
          this.collector.addError(error);
        }
        this.isValid = false;
      }
    }

    if (this.parsedJSON.developer) {
      const { name, url } = this.parsedJSON.developer;

      if (name) {
        this.parsedJSON.author = name;
      }

      if (url) {
        this.parsedJSON.homepage_url = url;
      }
    }

    if (this.parsedJSON.homepage_url) {
      this.validateHomePageURL(this.parsedJSON.homepage_url);
    }

    this.validateRestrictedPermissions();
    this.validateAddonID();
    this.validateHiddenAddon();
    this.validateDeprecatedBrowserStyle();
    this.validateIncognito();
  }

  /**
   * This method validates the manifest's name property in addition to the
   * basic json schema validation. The name should not contain unnecessary
   * whitespaces.
   */
  validateName() {
    const { name } = this.parsedJSON;
    // The JSON schema validation already emits an error for non-string values.
    if (typeof name !== 'string') {
      return;
    }

    // We are relying on the `trim` function to remove the whitespaces but it
    // doesn't cover all possible whitespace-like chars. See:
    // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/trim
    const trimmedName = name.trim();
    if (trimmedName !== name || trimmedName.length < 2) {
      this.collector.addError(messages.PROP_NAME_INVALID);
      this.isValid = false;
    }
  }

  /**
   * This method determines whether the value of the `version` manifest key is
   * valid for both AMO and Firefox, and strictness is a bit different depending
   * on the manifest version.
   *
   * For MV3+: we enforce the following format: the value must be a string that
   * has between 1 and 4 numbers, separated with dots. Each number must have up
   * to 9 digits and leading zeros are not allowed.
   *
   * For MV2 only: if the value matches the toolkit version, we emit a warning.
   * Otherwise, we enforce the same format as defined above for MV3 and above.
   */
  validateVersionString() {
    const { version } = this.parsedJSON;

    if (isValidVersionString(version)) {
      return;
    }

    if (
      this.parsedJSON.manifest_version < 3 &&
      isToolkitVersionString(version)
    ) {
      this.collector.addWarning(messages.VERSION_FORMAT_DEPRECATED);
    } else {
      this.collector.addError(messages.VERSION_FORMAT_INVALID);
      this.isValid = false;
    }
  }

  validateHiddenAddon() {
    // Only privileged add-ons can use the `hidden` manifest property.
    if (!this.isPrivilegedAddon) {
      return;
    }

    if (
      this.parsedJSON.hidden &&
      ('action' in this.parsedJSON ||
        'browser_action' in this.parsedJSON ||
        // Note: When this was introduced, it was stricter than the Firefox
        // side because Firefox didn't restrict `page_action` in Bug 1781998.
        'page_action' in this.parsedJSON)
    ) {
      this.collector.addError(messages.HIDDEN_NO_ACTION);
      this.isValid = false;
    }
  }

  validateDeprecatedBrowserStyle() {
    if (this.parsedJSON.manifest_version !== 3) {
      // The deprecation only affects MV2 -> MV3.
      return;
    }
    const checkBrowserStyleInManifestKey = (manifestKey) => {
      // Warn about `browser_style:true` because it is not compatible with
      // "future" Firefox versions (Firefox 118+). We don't warn about
      // `browser_style:false` because it is equivalent to not setting the
      // property. Furthermore, setting it to false ensures a consistent
      // appearance of MV3 extensions in Firefox 114 and earlier, because the
      // default of options_ui.browser_style and sidebar_action.browser_style
      // changed from true to false in Firefox 115.
      if (this.parsedJSON[manifestKey]?.browser_style) {
        const instancePath = `/${manifestKey}/browser_style`;
        // Minimal parameters to trigger manifest error.
        const errorParam = { params: { max_manifest_version: 2 } };
        this.collector.addWarning({
          instancePath,
          ...messages.manifestFieldUnsupported(instancePath, errorParam),
        });
      }
    };
    checkBrowserStyleInManifestKey('action');
    checkBrowserStyleInManifestKey('options_ui');
    checkBrowserStyleInManifestKey('page_action');
    checkBrowserStyleInManifestKey('sidebar_action');
  }

  validateRestrictedPermissions() {
    const permissions = Array.isArray(this.parsedJSON.permissions)
      ? this.parsedJSON.permissions
      : [];

    const permissionsInManifest = permissions.map((permission) =>
      String(permission).toLowerCase()
    );

    if (permissionsInManifest.length === 0) {
      return;
    }

    const minVersionSetInManifest = String(
      this.getMetadata().firefoxMinVersion
    );

    for (const permission of this.restrictedPermissions.keys()) {
      if (permissionsInManifest.includes(permission)) {
        const permMinVersion = this.restrictedPermissions.get(permission);

        if (
          !minVersionSetInManifest ||
          mozCompare(minVersionSetInManifest, permMinVersion) === -1
        ) {
          this.collector.addError(
            messages.makeRestrictedPermission(permission, permMinVersion)
          );
          this.isValid = false;
        }
      }
    }
  }

  validateAddonID() {
    if (!this.parsedJSON.applications?.gecko?.id) {
      if (this.parsedJSON.manifest_version < 3) {
        this.collector.addWarning(messages.MISSING_ADDON_ID);
      } else {
        this.collector.addError(messages.ADDON_ID_REQUIRED);
        this.isValid = false;
      }
    }
  }

  async validateIcon(iconPath, expectedSize) {
    try {
      const info = await getImageMetadata(this.io, iconPath);
      if (info.width !== info.height) {
        if (info.mime !== 'image/svg+xml') {
          this.collector.addError(messages.iconIsNotSquare(iconPath));
          this.isValid = false;
        } else {
          this.collector.addWarning(messages.iconIsNotSquare(iconPath));
        }
      } else if (
        expectedSize !== null &&
        info.mime !== 'image/svg+xml' &&
        parseInt(info.width, 10) !== parseInt(expectedSize, 10)
      ) {
        this.collector.addWarning(
          messages.iconSizeInvalid({
            path: iconPath,
            expected: parseInt(expectedSize, 10),
            actual: parseInt(info.width, 10),
          })
        );
      }
    } catch (err) {
      log.debug(
        `Unexpected error raised while validating icon "${iconPath}"`,
        err
      );
      this.collector.addWarning(
        messages.corruptIconFile({
          path: iconPath,
        })
      );
    }
  }

  validateIcons() {
    const icons = [];

    if (this.parsedJSON.icons) {
      Object.keys(this.parsedJSON.icons).forEach((size) => {
        icons.push([size, this.parsedJSON.icons[size]]);
      });
    }

    // Check for default_icon key at each of the action properties
    ['browser_action', 'page_action', 'sidebar_action'].forEach((key) => {
      if (this.parsedJSON[key] && this.parsedJSON[key].default_icon) {
        if (typeof this.parsedJSON[key].default_icon === 'string') {
          icons.push([null, this.parsedJSON[key].default_icon]);
        } else {
          Object.keys(this.parsedJSON[key].default_icon).forEach((size) => {
            icons.push([size, this.parsedJSON[key].default_icon[size]]);
          });
        }
      }
    });

    // Check for the theme_icons from the browser_action
    if (
      this.parsedJSON.browser_action &&
      this.parsedJSON.browser_action.theme_icons
    ) {
      this.parsedJSON.browser_action.theme_icons.forEach((icon) => {
        ['dark', 'light'].forEach((theme) => {
          if (icon[theme]) {
            icons.push([icon.size, icon[theme]]);
          }
        });
      });
    }

    const promises = [];
    const errorIcons = [];
    icons.forEach(([size, iconPath]) => {
      const _path = normalizePath(iconPath);
      if (!Object.prototype.hasOwnProperty.call(this.io.files, _path)) {
        if (!errorIcons.includes(_path)) {
          this.collector.addError(messages.manifestIconMissing(_path));
          this.isValid = false;
          errorIcons.push(_path);
        }
      } else if (
        !IMAGE_FILE_EXTENSIONS.includes(getNormalizedExtension(_path))
      ) {
        if (!errorIcons.includes(_path)) {
          this.collector.addWarning(messages.WRONG_ICON_EXTENSION);
        }
      } else {
        promises.push(this.validateIcon(_path, size));
      }
    });
    return Promise.all(promises);
  }

  async validateThemeImage(imagePath, manifestPropName) {
    const _path = normalizePath(imagePath);
    const ext = getNormalizedExtension(imagePath);

    const fileExists = this.validateFileExistsInPackage(
      _path,
      `theme.images.${manifestPropName}`,
      messages.manifestThemeImageMissing
    );

    // No need to validate the image format if the file doesn't exist
    // on disk.
    if (!fileExists) {
      return;
    }

    if (!IMAGE_FILE_EXTENSIONS.includes(ext) || ext === 'webp') {
      this.collector.addError(
        messages.manifestThemeImageWrongExtension({ path: _path })
      );
      this.isValid = false;
      return;
    }

    try {
      const info = await getImageMetadata(this.io, _path);
      if (
        !STATIC_THEME_IMAGE_MIMES.includes(info.mime) ||
        info.mime === 'image/webp'
      ) {
        this.collector.addError(
          messages.manifestThemeImageWrongMime({
            path: _path,
            mime: info.mime,
          })
        );
        this.isValid = false;
      } else if (FILE_EXTENSIONS_TO_MIME[ext] !== info.mime) {
        this.collector.addWarning(
          messages.manifestThemeImageMimeMismatch({
            path: _path,
            mime: info.mime,
          })
        );
      }
    } catch (err) {
      log.debug(
        `Unexpected error raised while validating theme image "${_path}"`,
        err.message
      );
      this.collector.addError(
        messages.manifestThemeImageCorrupted({ path: _path })
      );
      this.isValid = false;
    }
  }

  validateStaticThemeImages() {
    const promises = [];
    const themeImages = this.parsedJSON.theme && this.parsedJSON.theme.images;

    // The theme.images manifest property is mandatory on Firefox < 60, but optional
    // on Firefox >= 60.
    if (themeImages) {
      for (const prop of Object.keys(themeImages)) {
        if (Array.isArray(themeImages[prop])) {
          themeImages[prop].forEach((imagePath) => {
            promises.push(this.validateThemeImage(imagePath, prop));
          });
        } else {
          promises.push(this.validateThemeImage(themeImages[prop], prop));
        }
      }
    }

    return Promise.all(promises);
  }

  validateFileExistsInPackage(
    filePath,
    type,
    messageFunc = messages.manifestBackgroundMissing
  ) {
    const _path = normalizePath(filePath);
    if (!Object.prototype.hasOwnProperty.call(this.io.files, _path)) {
      this.collector.addError(messageFunc(_path, type));
      this.isValid = false;
      return false;
    }
    return true;
  }

  validateContentScriptMatchPattern(matchPattern) {
    BLOCKED_CONTENT_SCRIPT_HOSTS.split('\n').forEach((value) => {
      if (value && value.length > 0 && value.substr(0, 1) !== '#') {
        if (matchPattern.includes(value.trim())) {
          this.collector.addError(messages.MANIFEST_INVALID_CONTENT);
          this.isValid = false;
        }
      }
    });
  }

  validateCspPolicy(policy) {
    if (typeof policy === 'string') {
      this.validateCspPolicyString(policy, 'content_security_policy');
    } else if (policy != null) {
      const keys = Object.keys(policy);
      for (const key of keys) {
        this.validateCspPolicyString(
          policy[key],
          `content_security_policy.${key}`
        );
      }
    }
  }

  validateCspPolicyString(policy, manifestPropName) {
    if (typeof policy !== 'string') {
      return;
    }

    const directives = parseCspPolicy(policy);

    // The order is important here, 'default-src' needs to be before
    // 'script-src' to ensure it can overwrite default-src security policies
    const candidates = [
      'default-src',
      'script-src',
      'script-src-elem',
      'script-src-attr',
      'worker-src',
    ];

    const isSecureCspValue = (value) => CSP_KEYWORD_RE.test(value);

    // A missing default-src directive is very permissive, thus insecure:
    let insecureSrcDirective = !directives['default-src'];
    let warnInsecureCsp = insecureSrcDirective;
    let warnInsecureEval = false;

    for (let i = 0; i < candidates.length; i++) {
      /* eslint-disable no-continue */
      const candidate = candidates[i];
      if (Object.prototype.hasOwnProperty.call(directives, candidate)) {
        const values = directives[candidate];

        // If the 'default-src' is insecure, check whether the 'script-src'
        // makes it secure, ie 'script-src: self;'
        //
        // NOTE: this is not yet considering script-src-elem and script-src-attr,
        // and it can't be extended to them as is, each of them on their
        // own would not fully cover an insecure src directive and they would
        // need to be appropriately combined with other directives.
        if (
          insecureSrcDirective &&
          candidate === 'script-src' &&
          values.every(isSecureCspValue)
        ) {
          insecureSrcDirective = false;
          warnInsecureCsp = false;
          continue;
        }

        for (const value of values) {
          // Add a more detailed message for unsafe-eval to avoid confusion
          // about why it's forbidden.
          if (value === "'unsafe-eval'") {
            warnInsecureEval = true;
            continue;
          }

          if (!isSecureCspValue(value)) {
            warnInsecureCsp = true;
            // everything else looks like something we don't understand
            // / support otherwise is invalid so let's warn about that.
            if (candidate === 'default-src') {
              // Remember insecure 'default-src' to check whether a later
              // 'script-src' makes it secure
              insecureSrcDirective = true;
            }
            continue;
          }
        }
      }
    }
    if (warnInsecureEval) {
      this.collector.addWarning(
        messages.manifestCspUnsafeEval(manifestPropName)
      );
    }
    if (warnInsecureCsp) {
      this.collector.addWarning(messages.manifestCsp(manifestPropName));
    }
  }

  validateHomePageURL(url) {
    for (const restrictedUrl of RESTRICTED_HOMEPAGE_URLS) {
      if (url.includes(restrictedUrl)) {
        this.collector.addError(messages.RESTRICTED_HOMEPAGE_URL);
        this.isValid = false;
        return;
      }
    }
  }

  validateIncognito() {
    if (this.parsedJSON.incognito === 'split') {
      this.collector.addWarning(messages.INCOGNITO_SPLIT_UNSUPPORTED);
    }
  }

  validateDataCollectionPermissions(permissions) {
    // This property only applies to extensions.
    if (this.isStaticTheme || this.isLanguagePack || this.isDictionary) {
      return;
    }

    if (!permissions) {
      this.collector.addWarning(messages.MISSING_DATA_COLLECTION_PERMISSIONS);
      return;
    }

    const { has_previous_consent, required } = permissions;
    if (has_previous_consent) {
      this.collector.addError(messages.HAS_PREVIOUS_CONSENT_IS_RESERVED);
      this.isValid = false;
    }

    const requiredPermissions = Array.isArray(required) ? required : [];

    if (
      requiredPermissions.includes('none') &&
      requiredPermissions.length > 1
    ) {
      this.collector.addError(messages.NONE_DATA_COLLECTION_IS_EXCLUSIVE);
      this.isValid = false;
    }
  }

  getAddonId() {
    try {
      const { id } = this.parsedJSON.applications.gecko;
      return typeof id === 'undefined' ? null : id;
    } catch {
      log.error('Failed to get the id from the manifest.');
      return null;
    }
  }

  getExperimentApiPaths() {
    const apiPaths = new Set();

    const { experiment_apis } = this.parsedJSON;

    if (experiment_apis) {
      // We need to build a list of API "paths" for each registered experimental
      // API. The data in the `manifest.json` would look like this:
      //
      // "experiment_apis": {
      //   "some-name": {
      //     "schema": "experiments/some-name/schema.json",
      //     "parent": {
      //       "scopes": ["addon_parent"],
      //       "script": "experiments/some-name/api.js",
      //       "paths": [["some", "name"]]
      //     }
      //   }
      //
      // We are interested in the `paths` array (of array), which contains API
      // "paths". We need to get each entry for each experiment and we build API
      // "paths" like:
      //
      // Set(['some.name'])
      //
      // We could have either a "parent" or "child" property for each API, or
      // both although it is less common.
      //
      for (const key of Object.keys(experiment_apis)) {
        const { child, parent } = experiment_apis[key];
        const parentPaths = parent?.paths ?? [];
        const childPaths = child?.paths ?? [];

        [...parentPaths, ...childPaths]
          .filter((p) => Array.isArray(p) && p.length)
          .forEach((p) => apiPaths.add(p.join('.')));
      }
    }

    return apiPaths;
  }

  /**
   * @typedef {Object} Metadata
   * @property {string} id
   * @property {number} manifestVersion
   * @property {string} name
   * @property {number} type
   * @property {string} version
   * @property {string} firefoxMinVersion
   * @property {string} firefoxStrictMinVersion
   * @property {Set<string>} experimentApiPaths
   *
   * @returns {Metadata}
   */
  getMetadata() {
    return {
      id: this.getAddonId(),
      manifestVersion: this.parsedJSON.manifest_version,
      name: this.parsedJSON.name,
      type: PACKAGE_EXTENSION,
      version: this.parsedJSON.version,
      // This is the `strict_min_version` value set in the `manifest.json` file
      // for Firefox for desktop.
      firefoxMinVersion:
        this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.strict_min_version,
      // This is the strict min *major* version for Firefox for desktop.
      firefoxStrictMinVersion: firefoxStrictMinVersion(this.parsedJSON),
      experimentApiPaths: this.getExperimentApiPaths(),
    };
  }
}
