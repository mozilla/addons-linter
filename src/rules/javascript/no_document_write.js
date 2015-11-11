import { NO_DOCUMENT_WRITE } from 'messages/javascript';
import { getNodeReferenceName } from 'utils';

export default function(context) {
  return {
    CallExpression: function(node) {
      var objectName;
      if (typeof node.callee.object !== 'undefined' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.object.type === 'Identifier') {

        objectName = getNodeReferenceName(context, node.callee.object);

        // check to see if the node is document.write()
        if (objectName === 'document' &&
            node.callee.property.name === 'write') {

          return context.report(node, NO_DOCUMENT_WRITE.code);
        }
      }
    },
  };
}
