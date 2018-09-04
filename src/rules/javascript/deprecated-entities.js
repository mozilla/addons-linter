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
      // eslint-disable-next-line consistent-return
      CallExpression(node) {
        const referenceNode = getNodeReference(context, node.callee);
        // We're only looking for calls that look like `foo.bar()`.
        if (
          typeof referenceNode.object !== 'undefined' &&
          referenceNode.property.type === 'Identifier' &&
          referenceNode.object.type === 'Identifier'
        ) {
          const referenceObject = getNodeReference(
            context,
            referenceNode.object
          );

          for (let i = 0; i < DEPRECATED_ENTITIES.length; i++) {
            const entity = DEPRECATED_ENTITIES[i];
            // Check to see if the node matches a deprecated entity.
            if (
              referenceObject.name === entity.object &&
              referenceNode.property.name === entity.property
            ) {
              return context.report(node, entity.error.code);
            }
          }
        }
      },
    };
  },
};
