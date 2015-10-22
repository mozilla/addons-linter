import { RDF_OBSOLETE_TAGS, RDF_UNALLOWED_TAGS, RDF_UNALLOWED_IF_LISTED_TAGS,
  VALIDATION_ERROR, VALIDATION_WARNING } from 'const';
import * as messages from 'messages';


export function mustNotExist(xmlDoc, filename=null,
                             namespace='http://www.mozilla.org/2004/em-rdf#') {
  return new Promise((resolve) => {
    var bannedTags = RDF_UNALLOWED_TAGS;
    var validatorMessages = [];

    var addonIsListed = xmlDoc
      .getElementsByTagNameNS(namespace, 'listed').length > 0;

    if (addonIsListed) {
      bannedTags = bannedTags.concat(RDF_UNALLOWED_IF_LISTED_TAGS);
    }

    // Using any banned tag is an error.
    validatorMessages = validatorMessages.concat(
      _checkForTags({
        xmlDoc: xmlDoc,
        namespace: namespace,
        tags: bannedTags,
        type: VALIDATION_ERROR,
        prefix: 'TAG_NOT_ALLOWED_',
        filename: filename,
      })
    );

    // But using an obsolete tag is just a warning.
    validatorMessages = validatorMessages.concat(
      _checkForTags({
        xmlDoc: xmlDoc,
        namespace: namespace,
        tags: RDF_OBSOLETE_TAGS,
        type: VALIDATION_WARNING,
        prefix: 'TAG_OBSOLETE_',
        filename: filename,
      })
    );

    resolve(validatorMessages);
  });
}

export function _checkForTags({xmlDoc, namespace, tags, type, prefix,
                               filename=null} = {}) {
  var validatorMessages = [];

  for (let tag of tags) {
    let nodeList = xmlDoc.getElementsByTagNameNS(namespace, tag);

    for (let i = 0; i < nodeList.length; i++) {
      let element = nodeList.item(i);
      let errorCode = `${prefix}${tag.toUpperCase()}`;

      validatorMessages.push({
        code: errorCode,
        message: messages[errorCode].message,
        description: messages[errorCode].description,
        sourceCode: `<${tag}>`, // Don't really know what to use here.
        file: filename,
        line: element.line,
        column: element.column,
        type: type,
      });
    }
  }

  return validatorMessages;
}
