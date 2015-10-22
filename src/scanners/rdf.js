import XMLDom from 'xmldom';

import BaseScanner from 'scanners/base';
import { RDFParseError } from 'exceptions';
import * as rules from 'rules/rdf';


export default class RDFScanner extends BaseScanner {

  _defaultRules = rules;
  // I don't think this ever needs to be different, but if it does we can
  // extract the em namespace using:
  //
  // this.namespace = this._xmlDoc.documentElement._nsMap.em;
  //
  // Inside _getContents.
  namespace = 'http://www.mozilla.org/2004/em-rdf#';

  _getContents() {
    return new Promise((resolve, reject) => {
      var xmlDoc = new XMLDom.DOMParser({
        errorHandler: (err) => {
          reject(new RDFParseError(`RDF Parse Error: ${err}`));
        },
      }).parseFromString(this.contents, 'text/xml');

      resolve(xmlDoc);
    });
  }
}
