/* eslint-disable import/namespace */
import path from 'path';
import { readdirSync, existsSync, statSync } from 'fs';

import RJSON from 'relaxed-json';
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
  validateSitePermission,
  validateStaticTheme,
} from 'schema/validator';
import {
  DEPRECATED_MANIFEST_PROPERTIES,
  MANIFEST_JSON,
  PACKAGE_EXTENSION,
  CSP_KEYWORD_RE,
  IMAGE_FILE_EXTENSIONS,
  LOCALES_DIRECTORY,
  MESSAGES_JSON,
  FILE_EXTENSIONS_TO_MIME,
  INSTALL_ORIGINS_DATAPATH_REGEX,
  STATIC_THEME_IMAGE_MIMES,
  RESTRICTED_HOMEPAGE_URLS,
  RESTRICTED_PERMISSIONS,
  PERMS_DATAPATH_REGEX,
} from 'const';
import log from 'logger';
import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { isToolkitVersionString } from 'schema/formats';
import {
  parseCspPolicy,
  normalizePath,
  firefoxStrictMinVersion,
  basicCompatVersionComparison,
  firstStableVersion,
} from 'utils';
import BLOCKED_CONTENT_SCRIPT_HOSTS from 'blocked_content_script_hosts.txt';

async function getStreamImageSize(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
    try {
      return getImageSize(Buffer.concat(chunks));
    } catch (error) {
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
      this.selfHosted = selfHosted;
      this.schemaValidatorOptions = schemaValidatorOptions;

      const hasManifestKey = (key) =>
        Object.prototype.hasOwnProperty.call(this.parsedJSON, key);

      this.isStaticTheme = false;
      this.isLanguagePack = false;
      this.isDictionary = false;
      this.isSitePermission = false;

      // Keep the addon type detection in sync with the most updated logic
      // used on the Firefox side, as defined in ExtensionData parseManifest
      // method.
      if (hasManifestKey('theme')) {
        this.isStaticTheme = true;
      } else if (hasManifestKey('langpack_id')) {
        this.isLanguagePack = true;
      } else if (hasManifestKey('dictionaries')) {
        this.isDictionary = true;
      } else if (hasManifestKey('site_permissions')) {
        this.isSitePermission = true;
      }

      this.io = io;
      this.restrictedPermissions = restrictedPermissions;
      this._validate();
    }
  }

  checkKeySupport(support, minVersion, key, isPermission = false) {
    if (support.firefox) {
      // We don't have to support gaps in the `@mdn/browser-compat-data`
      // information for Firefox Desktop so far.
      const versionAdded = support.firefox.version_added;
      if (basicCompatVersionComparison(versionAdded, minVersion)) {
        if (!isPermission) {
          this.collector.addWarning(
            messages.keyFirefoxUnsupportedByMinVersion(
              key,
              this.parsedJSON.applications.gecko.strict_min_version,
              versionAdded
            )
          );
        } else {
          this.collector.addNotice(
            messages.permissionFirefoxUnsupportedByMinVersion(
              key,
              this.parsedJSON.applications.gecko.strict_min_version,
              versionAdded
            )
          );
        }
      }
    }

    if (support.firefox_android) {
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

      if (basicCompatVersionComparison(versionAddedAndroid, minVersion)) {
        if (!isPermission) {
          this.collector.addWarning(
            messages.keyFirefoxAndroidUnsupportedByMinVersion(
              key,
              this.parsedJSON.applications.gecko.strict_min_version,
              versionAddedAndroid
            )
          );
        } else {
          this.collector.addNotice(
            messages.permissionFirefoxAndroidUnsupportedByMinVersion(
              key,
              this.parsedJSON.applications.gecko.strict_min_version,
              versionAddedAndroid
            )
          );
        }
      }
    }
  }

  checkCompatInfo(compatInfo, minVersion, key, manifestKeyValue) {
    for (const subkey in compatInfo) {
      if (Object.prototype.hasOwnProperty.call(compatInfo, subkey)) {
        const subkeyInfo = compatInfo[subkey];
        if (subkey === '__compat') {
          this.checkKeySupport(subkeyInfo.support, minVersion, key);
        } else if (
          typeof manifestKeyValue === 'object' &&
          Object.prototype.hasOwnProperty.call(manifestKeyValue, subkey)
        ) {
          this.checkCompatInfo(
            subkeyInfo,
            minVersion,
            `${key}.${subkey}`,
            manifestKeyValue[subkey]
          );
        } else if (
          (key === 'permissions' || key === 'optional_permissions') &&
          manifestKeyValue.includes(subkey)
        ) {
          this.checkKeySupport(
            subkeyInfo.__compat.support,
            minVersion,
            `${key}:${subkey}`,
            true
          );
        }
      }
    }
  }

  errorLookup(error) {
    if (error.instancePath === '/permissions' && error.keyword === 'anyOf') {
      // With the addition of the schema data for the manifest_version 3
      // JSONSchema data, permissions has a top level anyOf schema entry
      // which include the two alternative set of schema definitions
      // for manifest_version 2 and manifest_version 3, which will produce
      // one more validation error in addition to the ones reported by the
      // manifest_version based entries included into it.
      //
      // The validation results from the nested entries are being already reported
      // before the top level anyOf one and so we can ignore this redundant validation
      // error.
      const isManifestVersionAnyOf =
        error.schema &&
        error.schema.every(
          (schema) =>
            'min_manifest_version' in schema || 'max_manifest_version' in schema
        );
      if (isManifestVersionAnyOf) {
        return null;
      }
    }

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

    if (error.keyword === 'required') {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.keyword === 'deprecated') {
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
      error.keyword === 'min_manifest_version' ||
      error.keyword === 'max_manifest_version'
    ) {
      // Choose a different message for permissions unsupported with the
      // add-on manifest_version.
      if (PERMS_DATAPATH_REGEX.test(error.instancePath)) {
        baseObject = messages.manifestPermissionUnsupported(error.data, error);
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
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
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

    let validate = validateAddon;

    if (this.isStaticTheme) {
      validate = validateStaticTheme;
    } else if (this.isLanguagePack) {
      validate = validateLangPack;
    } else if (this.isDictionary) {
      validate = validateDictionary;
    } else if (this.isSitePermission) {
      validate = validateSitePermission;
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

    if (
      this.parsedJSON.browser_specific_settings &&
      this.parsedJSON.applications
    ) {
      this.collector.addWarning(messages.IGNORED_APPLICATIONS_PROPERTY);
    }

    if (
      this.parsedJSON.browser_specific_settings &&
      this.parsedJSON.browser_specific_settings.gecko
    ) {
      this.parsedJSON.applications = this.parsedJSON.browser_specific_settings;
    }

    if (this.parsedJSON.content_security_policy) {
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
      if (Array.isArray(this.parsedJSON.background.scripts)) {
        this.parsedJSON.background.scripts.forEach((script) => {
          this.validateFileExistsInPackage(script, 'script');
        });
      }
      if (this.parsedJSON.background.page) {
        this.validateFileExistsInPackage(
          this.parsedJSON.background.page,
          'page'
        );
      }
      if (this.parsedJSON.background.service_worker) {
        if (this.parsedJSON.manifest_version >= 3) {
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
      !this.selfHosted &&
      this.parsedJSON.applications &&
      this.parsedJSON.applications.gecko &&
      this.parsedJSON.applications.gecko.update_url
    ) {
      this.collector.addError(messages.MANIFEST_UPDATE_URL);
      this.isValid = false;
    }

    if (
      !this.isLanguagePack &&
      this.parsedJSON.applications &&
      this.parsedJSON.applications.gecko &&
      this.parsedJSON.applications.gecko.strict_max_version
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

    const minVersion = firefoxStrictMinVersion(this.parsedJSON);
    if (!this.isLanguagePack && !this.isDictionary && minVersion) {
      for (const key in bcd.webextensions.manifest) {
        if (Object.prototype.hasOwnProperty.call(this.parsedJSON, key)) {
          const compatInfo = bcd.webextensions.manifest[key];
          this.checkCompatInfo(
            compatInfo,
            minVersion,
            key,
            this.parsedJSON[key]
          );
        }
      }
    }

    if (isToolkitVersionString(this.parsedJSON.version)) {
      this.collector.addNotice(messages.PROP_VERSION_TOOLKIT_ONLY);
    }

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

    if (!this.parsedJSON.default_locale && this.io && this.io.files) {
      const matchRx = /^_locales\/.*?\/messages.json$/;
      const fileList = Object.keys(this.io.files);
      for (let i = 0; i < fileList.length; i++) {
        const filePath = fileList[i];
        if (filePath.match(matchRx)) {
          this.collector.addError(messages.NO_DEFAULT_LOCALE);
          this.isValid = false;
          break;
        }
      }
    }

    if (this.parsedJSON.default_locale && this.io.path) {
      const rootPath = path.join(this.io.path, LOCALES_DIRECTORY);
      if (existsSync(rootPath)) {
        readdirSync(rootPath).forEach((langDir) => {
          if (statSync(path.join(rootPath, langDir)).isDirectory()) {
            const filePath = path.join(
              LOCALES_DIRECTORY,
              langDir,
              MESSAGES_JSON
            );

            // Convert filename to unix path separator before
            // searching it into the scanned files map.
            if (!this.io.files[upath.toUnix(filePath)]) {
              this.collector.addError(
                messages.noMessagesFileInLocales(
                  path.join(LOCALES_DIRECTORY, langDir)
                )
              );
              this.isValid = false;
            }
          }
        });
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
  }

  validateRestrictedPermissions() {
    const permissionsInManifest = (this.parsedJSON.permissions || []).map(
      (permission) => String(permission).toLowerCase()
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
    const directives = parseCspPolicy(policy);

    // Not sure about FTP here but CSP spec treats ws/wss as
    // equivalent to http/https.
    const validProtocols = ['ftp:', 'http:', 'https:', 'ws:', 'wss:'];
    // The order is important here, 'default-src' needs to be before
    // 'script-src' to ensure it can overwrite default-src security policies
    const candidates = ['default-src', 'script-src', 'worker-src'];

    let insecureSrcDirective = false;
    for (let i = 0; i < candidates.length; i++) {
      /* eslint-disable no-continue */
      const candidate = candidates[i];
      if (Object.prototype.hasOwnProperty.call(directives, candidate)) {
        const values = directives[candidate];

        // If the 'default-src' is insecure, check whether the 'script-src'
        // makes it secure, ie 'script-src: self;'
        if (
          insecureSrcDirective &&
          candidate === 'script-src' &&
          values.length === 1 &&
          values[0] === "'self'"
        ) {
          insecureSrcDirective = false;
        }

        for (let j = 0; j < values.length; j++) {
          let value = values[j].trim();

          if (value.startsWith('moz-extension:')) {
            // Valid, continue...
            continue;
          }

          const hasProtocol =
            (value.endsWith(':') && validProtocols.includes(value)) ||
            validProtocols.some((x) => value.startsWith(x));

          if (hasProtocol) {
            if (candidate === 'default-src') {
              // Remember insecure 'default-src' to check whether a later
              // 'script-src' makes it secure
              insecureSrcDirective = true;
            } else {
              this.collector.addWarning(messages.manifestCsp(manifestPropName));
            }
            continue;
          }

          // strip leading and ending single quotes.
          value = value.replace(/^[']/, '').replace(/[']$/, '');

          // Add a more detailed message for unsafe-eval to avoid confusion
          // about why it's forbidden.
          if (value === 'unsafe-eval') {
            this.collector.addWarning(
              messages.manifestCspUnsafeEval(manifestPropName)
            );
            continue;
          }

          if (value === '*' || value.search(CSP_KEYWORD_RE) === -1) {
            // everything else looks like something we don't understand
            // / support otherwise is invalid so let's warn about that.
            if (candidate === 'default-src') {
              // Remember insecure 'default-src' to check whether a later
              // 'script-src' makes it secure
              insecureSrcDirective = true;
            } else {
              this.collector.addWarning(messages.manifestCsp(manifestPropName));
            }
            continue;
          }
        }
      }
    }
    if (insecureSrcDirective) {
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

  getAddonId() {
    try {
      const { id } = this.parsedJSON.applications.gecko;
      return typeof id === 'undefined' ? null : id;
    } catch (e) {
      log.error('Failed to get the id from the manifest.');
      return null;
    }
  }

  getMetadata() {
    return {
      id: this.getAddonId(),
      manifestVersion: this.parsedJSON.manifest_version,
      name: this.parsedJSON.name,
      type: PACKAGE_EXTENSION,
      version: this.parsedJSON.version,
      firefoxMinVersion:
        this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.strict_min_version,
    };
  }
}
