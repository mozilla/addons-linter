import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import log from 'logger';
import { MANIFEST_NAME_INVALID, MANIFEST_VERSION_INVALID } from 'messages';


export default class ManifestJSONParser {

  constructor(jsonString, collector) {
    this.parsedJSON = JSON.parse(jsonString);
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
  }

  getMetadata() {
    return Promise.resolve({
      guid: this._getGuid(),
      manifestVersion: this._getManifestVersion(),
      name: this._getName(),
      type: this._getType(),
    });
  }

  _getGuid() {
    // NOTE: We validate this rule in `src/rules/metadata/guid_length`.
    // This is because both `install.rdf` and `manifest.json` share the same
    // requirements for guid.
    return this.parsedJSON.id;
  }

  _getType() {
    return PACKAGE_EXTENSION;
  }

  _getManifestVersion() {
    var manifestVersion = parseInt(this.parsedJSON.manifest_version, 10);
    if (manifestVersion !== VALID_MANIFEST_VERSION) {
      log.debug('Invalid manifest_version "%s"', manifestVersion);
      this.collector.addError(MANIFEST_VERSION_INVALID);
      manifestVersion = null;
    }
    return manifestVersion;
  }

  _getName() {
    var name = this.parsedJSON.name;
    if (typeof name !== 'string' || name.length === 0) {
      this.collector.addError(MANIFEST_NAME_INVALID);
      name = null;
    }
    return name;
  }
}
