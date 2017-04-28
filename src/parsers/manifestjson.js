import path from 'path';

import RJSON from 'relaxed-json';
import validate from 'schema/validator';

import { getConfig } from 'cli';
import { MANIFEST_JSON, PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import * as messages from 'messages';
import JSONParser from 'parsers/json';
import { isToolkitVersionString } from 'schema/formats';
import { singleLineString } from 'utils';

export default class ManifestJSONParser extends JSONParser {

  constructor(jsonString, collector, {
    filename=MANIFEST_JSON, RelaxedJSON=RJSON,
    selfHosted=getConfig().argv.selfHosted,
    io=null,
  }={}) {
    super(jsonString, collector, { filename: filename });

    this.parse(RelaxedJSON);

    // Set up some defaults in case parsing fails.
    if (typeof this.parsedJSON === 'undefined' || this.isValid === false) {
      this.parsedJSON = {
        manifestVersion: null,
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
    var baseObject = messages.JSON_INVALID;

    // This is the default from webextension-manifest-schema, but it's not a
    // super helpful error. We'll tidy it up a bit:
    if (error && error.message) {
      let lowerCaseMessage = error.message.toLowerCase();
      if (lowerCaseMessage === 'should not have additional properties') {
        error.message = 'is not a valid key or has invalid extra properties';
      }
    }

    var overrides = {
      message: `"${error.dataPath}" ${error.message}`,
      dataPath: error.dataPath,
    };

    if (error.keyword === 'required') {
      baseObject = messages.MANIFEST_FIELD_REQUIRED;
    } else if (error.dataPath.startsWith('/permissions') &&
               typeof error.data !== 'undefined' &&
               typeof error.data !== 'string') {
      baseObject = messages.MANIFEST_BAD_PERMISSION;
      overrides = {message: `Permissions ${error.message}.`};
    } else if (error.keyword === 'type') {
      baseObject = messages.MANIFEST_FIELD_INVALID;
    }

    // Arrays can be extremely verbose, this tries to make them a little
    // more sane. Using a regex because there will likely be more as we
    // expand the schema.
    var match = error.dataPath.match(/^\/(permissions)\/([\d+])/);
    if (match && baseObject.code !== messages.MANIFEST_BAD_PERMISSION.code) {
      baseObject = messages[`MANIFEST_${match[1].toUpperCase()}`];
      overrides.message = singleLineString`/${match[1]}: Unknown ${match[1]}
          "${error.data}" at ${match[2]}.`;
    }

    return Object.assign({}, baseObject, overrides);
  }

  _validate() {
    // Not all messages returned by the schema are fatal to Firefox, messages
    // that are just warnings should be added to this array.
    var warnings = [messages.MANIFEST_PERMISSIONS.code];

    this.isValid = validate(this.parsedJSON);
    if (!this.isValid) {
      log.debug('Schema Validation messages', validate.errors);

      for (let error of validate.errors) {
        var message = this.errorLookup(error);

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
      }
    }

    if (this.parsedJSON.content_security_policy) {
      this.collector.addWarning(messages.MANIFEST_CSP);
    }

    if (this.parsedJSON.update_url) {
      this.collector.addNotice(messages.MANIFEST_UNUSED_UPDATE);
    }

    if (!this.selfHosted && this.parsedJSON.applications &&
        this.parsedJSON.applications.gecko &&
        this.parsedJSON.applications.gecko.update_url) {
      this.collector.addError(messages.MANIFEST_UPDATE_URL);
      this.isValid = false;
    }

    if (isToolkitVersionString(this.parsedJSON.version)) {
      this.collector.addNotice(messages.PROP_VERSION_TOOLKIT_ONLY);
    }

    if (this.parsedJSON.default_locale) {
      let msg = path.join(
        '_locales', this.parsedJSON.default_locale, 'messages.json');
      if (!this.io.files[msg]) {
        this.collector.addError(messages.NO_MESSAGES_FILE);
        this.isValid = false;
      }
    }

    if (!this.parsedJSON.default_locale && this.io) {
      let match_re = /^_locales\/.*?\/messages.json$/;
      for (let filePath in this.io.files) {
        if (filePath.match(match_re)) {
          this.collector.addError(messages.NO_DEFAULT_LOCALE);
          this.isValid = false;
          break;
        }
      }
    }
  }

  getAddonId() {
    try {
      var id = this.parsedJSON.applications.gecko.id;
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

  getRisk() {
    /*
    Get the risk profile for this add-on based on the manifest keys
    specified in the manifest. Risk is float between 0 and 1 where 0 is low
    risk and 1 is high risk.

    This is a quick prototype of this functionality.
    */
    let risk = 0;
    let riskReasons = [];

    // Probably move this out to constants or something.
    let permissionsRisk = {
      nativeMessaging: 0.5,
      webRequest: 0.3,
      webRequestBlocking: 0.3,
      webNavigation: 0.2,
      unlimitedStorage: 0.2,
    };

    if (this.parsedJSON.permissions) {
      for (let permission in permissionsRisk) {
        if (this.parsedJSON.permissions.includes(permission)) {
          risk += permissionsRisk[permission];
          riskReasons.push(`Permission ${permission}`);
        }
      }
    }

    let matches = {
      '<all_urls>': 0.1,  // Making up that this is less for testing.
      '*://*/': 0.2, // This should be a regex.
      'http://*/': 0.2, // This should be a regex.
      'https://*/': 0.2, // This should be a regex.
    };

    if (this.parsedJSON.content_scripts) {
      for (let entry of this.parsedJSON.content_scripts) {
        for (let match in matches) {
          if (entry.matches.includes(match)) {
            risk += matches[match];
            riskReasons.push(`Match ${match}`);
          }
        }
        if (entry.matches.length > 4) {
          risk += 0.1;
          riskReasons.push(`Match ${entry.matches.length} domains`);
        }
        if (Object.keys(entry).includes('js')) {
          risk += 0.3;
          riskReasons.push(`Content script JS`);
        }
      }
    }

    let manifestKeys = {
      content_security_policy: 0.5,
      incognito: 0.1,
    }

    for (let key in manifestKeys) {
      let keys = Object.keys(this.parsedJSON)
      if (keys.includes(key)) {
        risk += manifestKeys[key];
        riskReasons.push(`Manifest key ${key}`);
      }
    }


    // Never go over 1.
    return {score: (Math.min(risk, 1)), reasons: riskReasons};
  }
}
