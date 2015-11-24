import { INIT_NULL_ARG } from 'messages/javascript';
import { getNodeReference } from 'utils';

export function init_null_arg(context) {
  return {
    CallExpression: function(node) {
      // Check if what's being called is nsiTransferable.init()
      if (typeof node.callee !== 'undefined') {
        let nodeReference = getNodeReference(context, node.callee);
        let nodeObject = getNodeReference(context, nodeReference.object);

        if (nodeObject === undefined) {
          return;
        }
        if (nodeObject.name === 'nsITransferable' &&
            nodeReference.property.name === 'init') {

          if (node.arguments.length > 0) {
            // Get the reference to the first arg and check if it's null.
            let arg = getNodeReference(context, node.arguments[0]);
            if (arg.value === null) {
              return context.report({node: node, message: INIT_NULL_ARG.code});
            }
          }
        }
      }
    },
  };
}
