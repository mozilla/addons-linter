/* eslint-disable import/namespace */
import path from 'path';

import RJSON from 'relaxed-json';
import { URL } from 'whatwg-url';
import { oneLine } from 'common-tags';
import sharp from 'sharp';

import { validateAddon, validateLangPack } from 'schema/validator';
import { getConfig } from 'cli';
import { MANIFEST_JSON, PACKAGE_EXTENSION, CSP_KEYWORD_RE, IMAGE_FILE_EXTENSIONS } from 'const';
import log from 'logger';
import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { isToolkitVersionString } from 'schema/formats';
import { parseCspPolicy } from 'utils';
import BLOCKED_CONTENT_SCRIPT_HOSTS from 'blocked_content_script_hosts.txt';


function normalizePath(iconPath) {
  // Convert the icon path to a URL so we can strip any fragments and resolve
  // . and .. automatically. We need an absolute URL to use as a base so we're
  // using https://example.com/.
  const { pathname } = new URL(iconPath, 'https://example.com/');
  return pathname.slice(1);
}

function getImageMetadata(io, iconPath) {
  return io.getFileAsStream(iconPath)
    .then((fileStream) => {
      return new Promise((resolve, reject) => {
        fileStream.pipe(sharp().metadata((err, info) => {
          if (err) {
            reject(err);
          } else {
            resolve(info);
          }
        }));
      });
    });
}


export default class ManifestJSONParser extends JSONParser {
  constructor(jsonString, collector, {
    filename = MANIFEST_JSON, RelaxedJSON = RJSON,
    selfHosted = getConfig().argv.selfHosted,
    isLanguagePack = getConfig().argv.langpack,
    io = null,
  } = {}) {
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
      this.isLanguagePack = isLanguagePack;
      this.io = io;
      this._validate();
    }
  }

  errorLookup(error) {
    // This is the default message.
    let baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      const lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should not have additional properties') {
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
    } else if (error.dataPath.startsWith('/permissions') &&
               typeof error.data !== 'undefined' &&
               typeof error.data !== 'string') {
      baseObject = messages.MANIFEST_BAD_PERMISSION;
      overrides.message = `Permissions ${error.message}.`;
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    const match = error.dataPath.match(/^\/(permissions)\/([\d+])/);
    if (match && baseObject.code !== messages.MANIFEST_BAD_PERMISSION.code) {
      baseObject = messages[`MANIFEST_${match[1].toUpperCase()}`];
      overrides.message = oneLine`/${match[1]}: Unknown ${match[1]}
          "${error.data}" at ${match[2]}.`;
    }

    return Object.assign({}, baseObject, overrides);
  }

  _validate() {
    // Not all messages returned by the schema are fatal to Firefox, messages
    // that are just warnings should be added to this array.
    const warnings = [messages.MANIFEST_PERMISSIONS.code];
    const validate = this.isLanguagePack ? validateLangPack : validateAddon;

    this.isValid = validate(this.parsedJSON);
    if (!this.isValid) {
      log.debug('Schema Validation messages', validate.errors);

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
        this.validateFileExistsInPackage(this.parsedJSON.background.page, 'page');
      }
    }

    if (this.parsedJSON.content_scripts && this.parsedJSON.content_scripts.length) {
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
              script, 'script', messages.manifestContentScriptFileMissing);
          });
        }
        if (scriptRule.css && scriptRule.css.length) {
          scriptRule.css.forEach((style) => {
            this.validateFileExistsInPackage(
              style, 'css', messages.manifestContentScriptFileMissing);
          });
        }
      });
    }

    if (!this.selfHosted && this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.update_url) {
      this.collector.addError(messages.MANIFEST_UPDATE_URL);
      this.isValid = false;
    }

    if (this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.strict_max_version) {
      this.collector.addNotice(messages.STRICT_MAX_VERSION);
    }

    if (isToolkitVersionString(this.parsedJSON.version)) {
      this.collector.addNotice(messages.PROP_VERSION_TOOLKIT_ONLY);
    }

    if (this.parsedJSON.default_locale) {
      const msg = path.join(
        '_locales', this.parsedJSON.default_locale, 'messages.json');
      if (!this.io.files[msg]) {
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
  }

  validateIcons() {
    const promises = [];
    const { icons } = this.parsedJSON;
    Object.keys(icons).forEach((size) => {
      const _path = normalizePath(icons[size]);
      if (!Object.prototype.hasOwnProperty.call(this.io.files, _path)) {
        this.collector.addError(messages.manifestIconMissing(_path));
        this.isValid = false;
      } else if (!IMAGE_FILE_EXTENSIONS.includes(_path.split('.').pop().toLowerCase())) {
        this.collector.addWarning(messages.WRONG_ICON_EXTENSION);
      } else {
        promises.push(
          getImageMetadata(this.io, _path)
            .then((info) => {
              if (info.width !== info.height) {
                this.collector.addError(messages.iconIsNotSquare(_path));
                this.isValid = false;
              } else if (parseInt(info.width, 10) !== parseInt(size, 10)) {
                this.collector.addWarning(messages.iconSizeInvalid({
                  path: _path,
                  expected: parseInt(size, 10),
                  actual: parseInt(info.width, 10),
                }));
              }
            })
            .catch(() => {
              this.collector.addWarning(messages.corruptIconFile({
                path: _path,
              }));
            })
        );
      }
    });
    return Promise.all(promises);
  }

  validateFileExistsInPackage(filePath, type, messageFunc = messages.manifestBackgroundMissing) {
    const _path = normalizePath(filePath);
    if (!Object.prototype.hasOwnProperty.call(this.io.files, _path)) {
      this.collector.addError(messageFunc(
        _path, type));
      this.isValid = false;
    }
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
    const directives = parseCspPolicy(policy);

    // Not sure about FTP here but CSP spec treats ws/wss as
    // equivalent to http/https.
    const validProtocols = ['ftp:', 'http:', 'https:', 'ws:', 'wss:'];
    const candidates = ['script-src', 'default-src', 'worker-src'];

    for (let i = 0; i < candidates.length; i++) {
      /* eslint-disable no-continue */
      const candidate = candidates[i];
      if (Object.prototype.hasOwnProperty.call(directives, candidate)) {
        const values = directives[candidate];

        for (let j = 0; j < values.length; j++) {
          let value = values[j].trim();

          if (value.startsWith('moz-extension:')) {
            // Valid, continue...
            continue;
          }

          const hasProtocol = (
            (value.endsWith(':') && validProtocols.includes(value)) ||
            (validProtocols.some((x) => value.startsWith(x))));

          if (hasProtocol) {
            this.collector.addWarning(messages.MANIFEST_CSP);
            continue;
          }

          // strip leading and ending single quotes.
          value = value.replace(/^[']/, '').replace(/[']$/, '');

          // Add a more detailed message for unsafe-eval to avoid confusion
          // about why it's forbidden.
          if (value === 'unsafe-eval') {
            this.collector.addWarning(messages.MANIFEST_CSP_UNSAFE_EVAL);
            continue;
          }

          if (value === '*' || value.search(CSP_KEYWORD_RE) === -1) {
            // everything else looks like something we don't understand
            // / support otherwise is invalid so let's warn about that.
            this.collector.addWarning(messages.MANIFEST_CSP);
            continue;
          }
        }
      }
    }
  }

  getAddonId() {
    try {
      const id = this.parsedJSON.applications.gecko.id;
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
    };
  }
}
