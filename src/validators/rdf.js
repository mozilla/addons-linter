import XMLDom from 'xmldom';

import { RDFParseError } from 'exceptions';
import * as rules from 'rules/rdf';


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
    this._domParser = null;
    this._xmlDoc = null;
  }

  scan(_rules=rules) {
    return new Promise((resolve, reject) => {
      this.getXMLDoc()
        .then((xmlDoc) => {
          var promises = [];

          for (let rule in _rules) {
            promises.push(_rules[rule](xmlDoc, this.namespace, this.filename));
          }

          return Promise.all(promises);
        })
        .then((ruleResults) => {
          for (let messages of ruleResults) {
            this.validatorMessages = this.validatorMessages.concat(messages);
          }
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
      }).parseFromString(this.contents, 'text/xml');

      resolve(this._xmlDoc);
    });
  }
}
