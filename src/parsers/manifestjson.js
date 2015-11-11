import { ADDON_TYPE_MAP,
         MANIFEST_JSON,
         PACKAGE_EXTENSION } from 'const';
import log from 'logger';
import { TYPE_INVALID,
         TYPE_MISSING } from 'messages';


export default class ManifestJSONParserr {

  constructor(jsonString, collector) {
    this.jsonString = jsonString;
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
  }

  getMetaData() {
    var parsedJSON = JSON.parse(this.jsonString);
    var addonMetaData = {};
    addonMetaData.type = this._getAddonType(parsedJSON);
    return Promise.resolve(addonMetaData);
  }

  _getAddonType(parsedJSON) {
    // TODO: Work out what this should really be.
    var manifestVersion = parsedJSON.manifest_version;
    if (typeof manifestVersion === 'undefined') {
      log.debug(`"manifest_version" was not found in ${MANIFEST_JSON}`);
      this.collector.addError(TYPE_MISSING);
      return null;
    }
    var addonType = ADDON_TYPE_MAP[manifestVersion];
    if (addonType !== PACKAGE_EXTENSION) {
      log.debug('Invalid type value "%s"', addonType);
      this.collector.addError(TYPE_INVALID);
      return null;
    }
    return addonType;
  }
}
