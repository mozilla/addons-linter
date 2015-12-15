import XMLDom from 'xmldom';

import { RDF_DEFAULT_NAMESPACE } from 'const';
import BaseScanner from 'scanners/base';
import * as rules from 'rules/rdf';


export default class RDFScanner extends BaseScanner {

  _defaultRules = rules;

  constructor(contents, filename, options={}) {
    super(contents, filename, options);
    // I don't think this ever needs to be different, but if it does we can
    // extract the em namespace using:
    //
    //     this.namespace = this._xmlDoc.documentElement._nsMap.em;
    //
    // Inside _getContents.
    if (typeof this.options.namespace === 'undefined') {
      this.options.namespace = RDF_DEFAULT_NAMESPACE;
    }
  }

  _getContents() {
    return new Promise((resolve, reject) => {
      var xmlDoc = new XMLDom.DOMParser({
        errorHandler: (err) => {
          reject(new Error(`RDFParseError: ${err}`));
        },
      }).parseFromString(this.contents, 'text/xml');

      resolve(xmlDoc);
    });
  }
}
