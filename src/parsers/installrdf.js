import { ADDON_TYPE_MAP, RDF_DEFAULT_NAMESPACE } from 'const';
import { RDF_TYPE_INVALID, RDF_NAME_MISSING,
         RDF_TYPE_MISSING } from 'messages';
import log from 'logger';


export default class InstallRdfParser {

  constructor(xmlDoc, collector, {namespace=RDF_DEFAULT_NAMESPACE}={}) {
    this.xmlDoc = xmlDoc;
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
    this.namespace = namespace;
  }

  getMetaData() {
    return Promise.resolve({
      guid: this._getGUID(),
      name: this._getName(),
      type: this._getAddonType(),
    });
  }

  _getNode(tag) {
    var typeNodes = this.xmlDoc.getElementsByTagName(tag);
    if (typeNodes.length > 1) {
      throw new Error(`Multiple <${tag}> elements found`);
    }
    return typeNodes[0];
  }

  _getAddonType() {
    var addonType = null;
    var node = this._getNode('em:type');
    if (node && node.firstChild && node.firstChild.nodeValue) {
      var typeValue = node.firstChild.nodeValue;
      if (!ADDON_TYPE_MAP.hasOwnProperty(typeValue)) {
        log.debug('Invalid type value "%s"', typeValue);
        this.collector.addError(RDF_TYPE_INVALID);
      } else {
        addonType = ADDON_TYPE_MAP[typeValue];
        log.debug('Mapping original <em:type> value "%s" -> "%s"',
                  typeValue, addonType);
      }
    } else {
      log.warn('<em:type> was not found in install.rdf');
      this.collector.addNotice(RDF_TYPE_MISSING);
    }
    return addonType;
  }

  _getGUID() {
    // NOTE: We validate this rule in one place: `Validator.getAddonMetaData()`.
    // This is because both `install.rdf` and `manifest.json` share the same
    // requirements for guid.
    var idElms = this.xmlDoc.getElementsByTagNameNS(this.namespace, 'id');
    if (idElms.length > 0) {
      var idNode = idElms.item(0);
      if (idNode && idNode.childNodes && idNode.childNodes[0]) {
        return idNode.childNodes[0];
      }
    }
    return null;
  }

  _getName() {
    var node = this._getNode('em:name');
    var name = null;
    if (node && node.firstChild && node.firstChild.nodeValue) {
      name = node.firstChild.nodeValue;
    } else {
      log.warn('<em:name> was not found in install.rdf');
      this.collector.addNotice(RDF_NAME_MISSING);
    }
    return name;
  }
}
