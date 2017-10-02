import { ADDON_TYPE_MAP, RDF_DEFAULT_NAMESPACE } from 'const';
import * as messages from 'messages';
import log from 'logger';


export default class InstallRdfParser {
  constructor(xmlDoc, collector, { namespace = RDF_DEFAULT_NAMESPACE } = {}) {
    this.xmlDoc = xmlDoc;
    // Provides ability to directly add messages to
    // the collector.
    this.collector = collector;
    this.namespace = namespace;
  }

  getMetadata() {
    return new Promise((resolve, reject) => {
      const guid = this._getGUID();
      const name = this._getName();
      const type = this._getAddonType();
      const version = this._getVersion();
      const restartless = this._getIsBootstrapped();
      if (guid === null || name === null || version === null) {
        return reject(new Error(`Cannot get metadata,
                                  version, name, or id tag is missing`));
      }
      return resolve({
        guid,
        name,
        type,
        version,
        restartless,
      });
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
    const descriptionTag = this._getDescriptionNode();
    if (!descriptionTag) return null;
    return this._makeArray(descriptionTag.childNodes)
      .filter((node) => node.nodeName === tagName);
  }

  _getTopLevelNodeByTag(tag) {
    const nodes = this._getTopLevelNodesByTag(tag);
    if (!nodes) return null;
    // add an error if there's more than one node as these
    // should be unique.
    if (nodes.length > 1) {
      const match = tag.match(/:(.*$)/);
      this.collector.addError(messages.rdfMultipleTags((match && match[1]) || tag));
      return null;
    }
    return nodes[0];
  }

  _getRDFNode() {
    const rdfNodes = this.xmlDoc.getElementsByTagName('RDF');
    if (!rdfNodes.length) {
      this.collector.addError(messages.RDF_TAG_NOT_FOUND);
      return null;
    }
    if (rdfNodes.length > 1) {
      this.collector.addError(messages.rdfMultipleTags('RDF'));
      return null;
    }
    return rdfNodes[0];
  }

  _getDescriptionNode() {
    const rdfNode = this._getRDFNode();
    if (!rdfNode) return null;
    const descriptionNodes = Array.prototype.slice.call(rdfNode.childNodes)
      .filter((node) => node.nodeName === 'Description');
    if (descriptionNodes.length > 1) {
      this.collector.addError(messages.RDF_MANY_CHILDREN);
      return null;
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
    let addonType = null;
    const node = this._getTopLevelNodeByTag('em:type');

    if (node && node.firstChild && node.firstChild.nodeValue) {
      const typeValue = node.firstChild.nodeValue;
      if (!Object.prototype.hasOwnProperty.call(ADDON_TYPE_MAP, typeValue)) {
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
    const guid = this._getNodeValue(this._getTopLevelNodeByTag('em:id'));
    if (!guid) {
      this.collector.addError(messages.RDF_ID_MISSING);
    }
    if (guid && guid.length > 255) {
      this.collector.addError(messages.RDF_GUID_TOO_LONG);
    }
    return guid;
  }

  _getName() {
    const name = this._getNodeValue(this._getTopLevelNodeByTag('em:name'));
    if (name === null) {
      this.collector.addError(messages.RDF_NAME_MISSING);
    }
    return name;
  }

  _getVersion() {
    const version = this._getNodeValue(this._getTopLevelNodeByTag('em:version'));
    if (version === null) {
      this.collector.addError(messages.RDF_VERSION_MISSING);
    }
    return version;
  }
}
