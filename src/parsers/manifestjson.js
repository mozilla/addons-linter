/* eslint-disable import/namespace */
import path from 'path';
import { readdirSync, existsSync, statSync } from 'fs';

import RJSON from 'relaxed-json';
import { oneLine } from 'common-tags';
import probeImageSize from 'probe-image-size';
import upath from 'upath';
import bcd from '@mdn/browser-compat-data';

import { getDefaultConfigValue } from 'yargs-options';
import {
  validateAddon,
  validateDictionary,
  validateLangPack,
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
  MIME_TO_FILE_EXTENSIONS,
  STATIC_THEME_IMAGE_MIMES,
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
} from 'utils';
import BLOCKED_CONTENT_SCRIPT_HOSTS from 'blocked_content_script_hosts.txt';

async function getImageMetadata(io, iconPath) {
  // Get a non-utf8 input stream by setting encoding to null.
  // (only needed for the 'io/directory' module which open the file using the utf-8
  // encoding by default).
  let encoding = null;

  if (iconPath.endsWith('.svg')) {
    encoding = 'utf-8';
  }

  const data = await io.getFileAsStream(iconPath, { encoding });
  return probeImageSize(data);
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
      io = null,
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
      this.isLanguagePack = Object.prototype.hasOwnProperty.call(
        this.parsedJSON,
        'langpack_id'
      );
      this.isDictionary = Object.prototype.hasOwnProperty.call(
        this.parsedJSON,
        'dictionaries'
      );
      this.isStaticTheme = Object.prototype.hasOwnProperty.call(
        this.parsedJSON,
        'theme'
      );
      this.io = io;
      this._validate();
    }
  }

  checkKeySupport(support, minVersion, key, isPermission = false) {
    if (support.firefox) {
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
      const versionAddedAndroid = support.firefox_android.version_added;
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
    // This is the default message.
    let baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      const lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should match some schema in anyof') {
        // eslint-disable-next-line no-param-reassign
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    const overrides = {
      message: `"${error.dataPath}" ${error.message}`,
      dataPath: error.dataPath,
    };

    if (error.keyword === 'required') {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.keyword === 'deprecated') {
      if (
        Object.prototype.hasOwnProperty.call(
          DEPRECATED_MANIFEST_PROPERTIES,
          error.dataPath
        )
      ) {
        baseObject = messages[DEPRECATED_MANIFEST_PROPERTIES[error.dataPath]];

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
      error.dataPath.startsWith('/permissions') &&
      typeof error.data !== 'undefined' &&
      typeof error.data !== 'string'
    ) {
      baseObject = messages.MANIFEST_BAD_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (
      error.dataPath.startsWith('/optional_permissions') &&
      typeof error.data !== 'undefined' &&
      typeof error.data !== 'string'
    ) {
      baseObject = messages.MANIFEST_BAD_OPTIONAL_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    const match = error.dataPath.match(
      /^\/(permissions|optional_permissions)\/([\d+])/
    );
    if (
      match &&
      baseObject.code !== messages.MANIFEST_BAD_PERMISSION.code &&
      baseObject.code !== messages.MANIFEST_BAD_OPTIONAL_PERMISSION.code
    ) {
      baseObject = messages[`MANIFEST_${match[1].toUpperCase()}`];
      overrides.message = oneLine`/${match[1]}: Unknown ${match[1]}
          "${error.data}" at ${match[2]}.`;
    }

    return { ...baseObject, ...overrides };
  }

  _validate() {
    // Not all messages returned by the schema are fatal to Firefox, messages
    // that are just warnings should be added to this array.
    const warnings = [
      messages.MANIFEST_PERMISSIONS.code,
      messages.MANIFEST_OPTIONAL_PERMISSIONS.code,
    ];
    let validate = validateAddon;

    if (this.isStaticTheme) {
      validate = validateStaticTheme;
    } else if (this.isLanguagePack) {
      validate = validateLangPack;
    } else if (this.isDictionary) {
      validate = validateDictionary;
    }

    this.isValid = validate(this.parsedJSON);
    if (!this.isValid) {
      log.debug(
        'Schema Validation messages',
        JSON.stringify(validate.errors, null, 2)
      );

      validate.errors.forEach((error) => {
        const message = this.errorLookup(error);

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

    if (this.parsedJSON.background) {
      if (this.parsedJSON.background.scripts) {
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
        // TODO: replace this with a call to this.validateFileExistsInPackage
        // once background.service_worker is supported on the Firefox side and
        // we can accept it on AMO submissions
        // (https://github.com/mozilla/addons-linter/issues/3290).
        this.collector.addError(
          messages.manifestFieldUnsupported('background.service_worker')
        );
        this.isValid = false;
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
      const numberOfDictionaries = Object.keys(this.parsedJSON.dictionaries)
        .length;
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

    if (this.parsedJSON.homepage_url) {
      this.validateHomePageURL(this.parsedJSON.homepage_url);
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
      } else if (!MIME_TO_FILE_EXTENSIONS[info.mime].includes(ext)) {
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
    const restrictedDomain = 'addons-dev.allizom.org';
    if (url.indexOf(restrictedDomain) !== -1) {
      this.collector.addError(messages.RESTRICTED_HOMEPAGE_URL);
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
