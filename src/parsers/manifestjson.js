/* eslint-disable import/namespace */
import path from 'path';

import RJSON from 'relaxed-json';
import { URL } from 'whatwg-url';
import { oneLine } from 'common-tags';
import sharp from 'sharp';

import validate from 'schema/validator';
import { getConfig } from 'cli';
import { MANIFEST_JSON, PACKAGE_EXTENSION, CSP_KEYWORD_RE, IMAGE_FILE_EXTENSIONS } from 'const';
import log from 'logger';
import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { isToolkitVersionString } from 'schema/formats';
import { parseCspPolicy } from 'utils';

function normalizePath(iconPath) {
  // Convert the icon path to a URL so we can strip any fragments and resolve
  // . and .. automatically. We need an absolute URL to use as a base so we're
  // using https://example.com/.
  const { pathname } = new URL(iconPath, 'https://example.com/');
  return pathname.slice(1);
}


function getImageMetadata(iconPath) {
  return new Promise((resolve, reject) => {
    const image = sharp(iconPath);
    image
      .metadata()
      .then((info) => {
        resolve(info);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export default class ManifestJSONParser extends JSONParser {
  constructor(jsonString, collector, {
    filename = MANIFEST_JSON, RelaxedJSON = RJSON,
    selfHosted = getConfig().argv.selfHosted,
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
      } else if (!IMAGE_FILE_EXTENSIONS.includes(icons[size].split('.').pop().toLowerCase())) {
        this.collector.addWarning(messages.WRONG_ICON_EXTENSION);
      } else {
        promises.push(
          getImageMetadata(icons[size])
            .then((info) => {
              if (info.width !== info.height) {
                this.collector.addError(messages.iconIsNotSquare(path));
                this.isValid = false;
              } else if (parseInt(info.width, 10) !== parseInt(size, 10)) {
                this.collector.addWarning(messages.iconSizeInvalid({
                  path,
                  expected: parseInt(size, 10),
                  actual: parseInt(info.width, 10),
                }));
              }
            })
            .catch(() => {
              this.collector.addWarning(messages.corruptIconFile({
                path,
              }));
            })
        );
      }
    });
    return Promise.all(promises);
  }

  validateFileExistsInPackage(filePath, type) {
    const _path = normalizePath(filePath);
    if (!Object.prototype.hasOwnProperty.call(this.io.files, _path)) {
      this.collector.addError(messages.manifestBackgroundMissing(
        _path, type));
      this.isValid = false;
    }
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
