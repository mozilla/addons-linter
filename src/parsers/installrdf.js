import { ADDON_TYPE_MAP, RDF_DEFAULT_NAMESPACE } from 'const';
import { RDF_TYPE_INVALID, RDF_NAME_MISSING,
         RDF_TYPE_MISSING } from 'messages';
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

  _getAddonType() {
    var addonType = null;
    var node = this._getTopLevelNodeByTag('em:type');

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
    // NOTE: We validate this rule in `src/rules/metadata/guid_length`.
    // This is because both `install.rdf` and `manifest.json` share the same
    // requirements for guid.
    var idNode = this._getTopLevelNodeByTag('em:id');
    if (idNode && idNode.firstChild && idNode.firstChild.nodeValue) {
      return idNode.firstChild.nodeValue;
    }
    return null;
  }

  _getName() {
    var node = this._getTopLevelNodeByTag('em:name');
    var name = null;
    if (node && node.firstChild && node.firstChild.nodeValue) {
      name = node.firstChild.nodeValue;
      log.debug('Extracted <em:name> value: %s', name);
    } else {
      log.warn('<em:name> was not found in install.rdf');
      this.collector.addNotice(RDF_NAME_MISSING);
    }
    return name;
  }
}
