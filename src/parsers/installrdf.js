import { ADDON_TYPE_MAP, RDF_DEFAULT_NAMESPACE } from 'const';
import * as messages from 'messages';
import log from 'logger';
import { singleLineString } from 'utils';


export default class InstallRdfParser {

  constructor(xmlDoc, collector, {namespace=RDF_DEFAULT_NAMESPACE}={}) {
    this.xmlDoc = xmlDoc;
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
    this.namespace = namespace;
  }

  getMetadata() {
    return Promise.resolve({
      guid: this._getGUID(),
      name: this._getName(),
      type: this._getAddonType(),
      version: this._getVersion(),
      restartless: this._getIsBootstrapped(),
    });
  }

  /*
   * Convert a nodeList to an Array.
   */
  _makeArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }

  /*
   * Gets topLevel tags e.g. RDF -> Description -> tag
   */
  _getTopLevelNodesByTag(tagName) {
    var descriptionTag = this._getDescriptionNode();
    return this._makeArray(descriptionTag.childNodes)
      .filter((node) => node.nodeName === tagName);
  }

  _getTopLevelNodeByTag(tag) {
    var nodes = this._getTopLevelNodesByTag(tag);
    // Throw an error if there's more than one node as these
    // should be unique.
    if (nodes.length > 1) {
      throw new Error(`Multiple <${tag}> elements found`);
    }
    return nodes[0];
  }

  _getRDFNode() {
    var rdfNodes = this.xmlDoc.getElementsByTagName('RDF');
    if (!rdfNodes.length) {
      throw new Error('RDF Node is not defined');
    }
    if (rdfNodes.length > 1) {
      throw new Error('Multiple RDF tags found');
    }
    return rdfNodes[0];
  }

  _getDescriptionNode() {
    var rdfNode = this._getRDFNode();
    var descriptionNodes = Array.prototype.slice.call(rdfNode.childNodes)
      .filter((node) => node.nodeName === 'Description');
    if (descriptionNodes.length > 1) {
      throw new Error(singleLineString`RDF node should only have a
        single descendant <Description>`);
    }
    return descriptionNodes[0];
  }

  _getNodeValue(node) {
    if (node && node.firstChild && node.firstChild.nodeValue) {
      return node.firstChild.nodeValue;
    }
    return null;
  }

  _getAddonType() {
    var addonType = null;
    var node = this._getTopLevelNodeByTag('em:type');

    if (node && node.firstChild && node.firstChild.nodeValue) {
      var typeValue = node.firstChild.nodeValue;
      if (!ADDON_TYPE_MAP.hasOwnProperty(typeValue)) {
        log.debug('Invalid type value "%s"', typeValue);
        this.collector.addError(messages.RDF_TYPE_INVALID);
      } else {
        addonType = ADDON_TYPE_MAP[typeValue];
        log.debug('Mapping original <em:type> value "%s" -> "%s"',
                  typeValue, addonType);
      }
    } else {
      log.warn('<em:type> was not found in install.rdf');
      this.collector.addNotice(messages.RDF_TYPE_MISSING);
    }
    return addonType;
  }

  _getIsBootstrapped() {
    return this._getNodeValue(
      this._getTopLevelNodeByTag('em:bootstrap')) === 'true';
  }

  _getGUID() {
    // Install.rdf only.
    var guid = this._getNodeValue(this._getTopLevelNodeByTag('em:id'));
    if (!guid) {
      this.collector.addError(messages.RDF_ID_MISSING);
    }
    if (guid && guid.length > 255) {
      this.collector.addError(messages.RDF_GUID_TOO_LONG);
    }
    return guid;
  }

  _getName() {
    var name = this._getNodeValue(this._getTopLevelNodeByTag('em:name'));
    if (name === null) {
      this.collector.addError(messages.RDF_NAME_MISSING);
    }
    return name;
  }

  _getVersion() {
    var version = this._getNodeValue(this._getTopLevelNodeByTag('em:version'));
    if (version === null) {
      this.collector.addError(messages.RDF_VERSION_MISSING);
    }
    return version;
  }
}
