/* eslint-disable import/namespace */
import {
  RDF_OBSOLETE_TAGS,
  RDF_UNALLOWED_TAGS,
  RDF_UNALLOWED_IF_LISTED_TAGS,
  VALIDATION_ERROR,
  VALIDATION_WARNING } from 'const';
import * as messages from 'messages';


export function _checkForTags({ xmlDoc, namespace, tags, type, prefix,
  filename } = {}) {
  const linterMessages = [];

  tags.forEach((tag) => {
    const nodeList = xmlDoc.getElementsByTagNameNS(namespace, tag);

    for (let i = 0; i < nodeList.length; i++) {
      const element = nodeList.item(i);
      const errorCode = `${prefix}${tag.toUpperCase()}`;

      linterMessages.push({
        code: errorCode,
        message: messages[errorCode].message,
        description: messages[errorCode].description,
        sourceCode: `<${tag}>`, // Don't really know what to use here.
        file: filename,
        line: element.line,
        column: element.column,
        type,
      });
    }
  });

  return linterMessages;
}

export function mustNotExist(xmlDoc, filename, { namespace } = {}) {
  return new Promise((resolve) => {
    let bannedTags = RDF_UNALLOWED_TAGS;
    let linterMessages = [];

    const addonIsListed = xmlDoc
      .getElementsByTagNameNS(namespace, 'listed').length > 0;

    if (addonIsListed) {
      bannedTags = bannedTags.concat(RDF_UNALLOWED_IF_LISTED_TAGS);
    }

    // Using any banned tag is an error.
    linterMessages = linterMessages.concat(
      _checkForTags({
        xmlDoc,
        namespace,
        tags: bannedTags,
        type: VALIDATION_ERROR,
        prefix: 'TAG_NOT_ALLOWED_',
        filename,
      })
    );

    // But using an obsolete tag is just a warning.
    linterMessages = linterMessages.concat(
      _checkForTags({
        xmlDoc,
        namespace,
        tags: RDF_OBSOLETE_TAGS,
        type: VALIDATION_WARNING,
        prefix: 'TAG_OBSOLETE_',
        filename,
      })
    );

    resolve(linterMessages);
  });
}
