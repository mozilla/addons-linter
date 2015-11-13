import { PACKAGE_EXTENSION, VALID_MANIFEST_VERSION } from 'const';
import log from 'logger';
import { MANIFEST_VERSION_INVALID } from 'messages';


export default class ManifestJSONParserr {

  constructor(jsonString, collector) {
    this.jsonString = jsonString;
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
  }

  getMetaData() {
    var parsedJSON = JSON.parse(this.jsonString);
    return Promise.resolve({
      guid: parsedJSON.id,
      type: PACKAGE_EXTENSION,
      manifestVersion: this.getManifestVersion(parsedJSON),
    });
  }

  getManifestVersion(parsedJSON) {
    var manifestVersion = parseInt(parsedJSON.manifest_version, 10);
    if (manifestVersion !== VALID_MANIFEST_VERSION) {
      log.debug('Invalid manifest_version "%s"', manifestVersion);
      this.collector.addError(MANIFEST_VERSION_INVALID);
      manifestVersion = null;
    }
    return manifestVersion;
  }
}
