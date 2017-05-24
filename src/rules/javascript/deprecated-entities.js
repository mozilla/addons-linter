import { NO_DOCUMENT_WRITE } from 'messages';
import { getNodeReference } from 'utils';

export const DEPRECATED_ENTITIES = [
  {
    error: NO_DOCUMENT_WRITE,
    object: 'document',
    property: 'write',
  },
];


export default {
  create(context) {
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
  },
};
