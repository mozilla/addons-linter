import { NO_DOCUMENT_WRITE, NSI_DNS_SERVICE_RESOLVE,
         NSI_SOUND_PLAY, TAB_URL_OVERRIDE } from 'messages';
import { getNodeReference } from 'utils';

export const DEPRECATED_ENTITIES = [
  {
    error: NO_DOCUMENT_WRITE,
    object: 'document',
    property: 'write',
  }, {
    error: NSI_DNS_SERVICE_RESOLVE,
    object: 'nsIDNSService',
    property: 'resolve',
  }, {
    error: NSI_SOUND_PLAY,
    object: 'nsISound',
    property: 'play',
  }, {
    error: TAB_URL_OVERRIDE,
    object: 'NewTabURL',
    property: 'override',
  },
];


export function deprecated_entities(context) {
  return {
    CallExpression: function(node) {
      let referenceNode = getNodeReference(context, node.callee);
      // We're only looking for calls that look like `foo.bar()`.
      if (typeof referenceNode.object !== 'undefined' &&
          referenceNode.property.type === 'Identifier' &&
          referenceNode.object.type === 'Identifier') {

        let referenceObject = getNodeReference(context, referenceNode.object);

        for (let entity of DEPRECATED_ENTITIES) {
          // Check to see if the node matches a deprecated entity.
          if (referenceObject.name === entity.object &&
              referenceNode.property.name === entity.property) {
            return context.report(node, entity.error.code);
          }
        }
      }
    },
  };
}
