import XMLDom from 'xmldom';

import { RDF_OBSOLETE_TAGS, RDF_UNALLOWED_TAGS, RDF_UNALLOWED_IF_LISTED_TAGS,
  VALIDATION_ERROR, VALIDATION_WARNING } from 'const';
import { RDFParseError } from 'exceptions';
import * as messages from 'messages';


export default class RDFScanner {

  constructor(contents, filename) {
    this.contents = contents;
    this.filename = filename;
    // I don't think this ever needs to be different, but if it does we can
    // extract the em namespace using:
    //
    // this.namespace = this._xmlDoc.documentElement._nsMap.em;
    this.namespace = 'http://www.mozilla.org/2004/em-rdf#';
    this.validatorMessages = [];
    this._xmlDoc = null;
  }

  scan() {
    return new Promise((resolve, reject) => {
      this.mustNotExist()
        .then(() => {
          resolve(this.validatorMessages);
        })
        .catch(reject);
    });
  }

  getXMLDoc() {
    return new Promise((resolve, reject) => {
      if (this._xmlDoc !== null) {
        return resolve(this._xmlDoc);
      }

      this._xmlDoc = new XMLDom.DOMParser({
        errorHandler: (err) => {
          reject(new RDFParseError(`RDF Parse Error: ${err}`));
        },
      }).parseFromString(this.contents);

      resolve(this._xmlDoc);
    });
  }

  mustNotExist() {
    return new Promise((resolve, reject) => {
      this.getXMLDoc()
        .then((xmlDoc) => {
          var bannedTags = RDF_UNALLOWED_TAGS;
          var addonIsListed = (xmlDoc
            .getElementsByTagNameNS(this.namespace, 'listed').length > 0);

          if (addonIsListed) {
            bannedTags.concat(RDF_UNALLOWED_IF_LISTED_TAGS);
          }

          // Using any banned tag is an error.
          return this._checkForTags(bannedTags, VALIDATION_ERROR,
                                    'TAG_NOT_ALLOWED_');
        }).then(() => {
          // But using an obsolete tag is just a warning.
          return this._checkForTags(RDF_OBSOLETE_TAGS, VALIDATION_WARNING,
                                    'TAG_OBSOLETE_');
        })
        .then(resolve)
        .catch(reject);
    });
  }

  _checkForTags(tags, severity, errorCodePrefix) {
    return new Promise((resolve, reject) => {
      this.getXMLDoc()
        .then((xmlDoc) => {
          for (let tag of tags) {
            let nodeList = xmlDoc.getElementsByTagNameNS(this.namespace, tag);

            if (nodeList.length > 0) {
              for (let i = 0; i < nodeList.length; i++) {
                let element = nodeList.item(i);
                let errorCode = `${errorCodePrefix}${tag.toUpperCase()}`;

                this.validatorMessages.push({
                  code: errorCode,
                  message: messages[errorCode].message,
                  description: messages[errorCode].description,
                  sourceCode: `<${tag}>`, // Don't really know what to use here.
                  file: this.filename,
                  line: element.line,
                  column: element.column,
                  severity: severity,
                });
              }
            }
          }

          resolve();
        })
        .catch(reject);
    });
  }
}
