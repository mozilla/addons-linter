import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import log from 'logger';
import * as messages from 'messages';


export default class ManifestJSONParser {

  constructor(jsonString, collector) {
    this.parsedJSON = JSON.parse(jsonString);
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
  }

  getMetadata() {
    return Promise.resolve({
      manifestVersion: this._getManifestVersion(),
      name: this._getName(),
      type: this._getType(),
      version: this._getVersion(),
      restartless: true, // All web extensions are restartless
    });
  }

  _getType() {
    return PACKAGE_EXTENSION;
  }

  _getManifestVersion() {
    // Manifest.json specific.
    var manifestVersion = this.parsedJSON.manifest_version;
    // manifestVersion must be a number.
    if (typeof manifestVersion !== 'number' ||
        manifestVersion !== VALID_MANIFEST_VERSION) {
      log.debug('Invalid manifest_version "%s"', manifestVersion);
      this.collector.addError(messages.MANIFEST_VERSION_INVALID);
      manifestVersion = null;
    }
    return manifestVersion;
  }

  _getName() {
    var name = this.parsedJSON.name || null;
    if (!name) {
      this.collector.addError(messages.PROP_NAME_MISSING);
    } else if (typeof name !== 'string') {
      log.debug('Invalid name "%s"', name);
      this.collector.addError(messages.PROP_NAME_INVALID);
      name = null;
    }
    return name;
  }

  _getVersion() {
    var version = this.parsedJSON.version || null;
    if (!version) {
      this.collector.addError(messages.PROP_VERSION_MISSING);
    } else if (typeof version !== 'string') {
      log.debug('Invalid version "%s"', version);
      this.collector.addError(messages.PROP_VERSION_INVALID);
      version = null;
    }
    return version;
  }
}
