import { EVENT_LISTENER_FOURTH } from 'messages/javascript';
import { getNodeReference } from 'utils';

export function event_listener_fourth(context) {
  return {
    CallExpression: function(node) {
      let referenceNode = getNodeReference(context, node.callee);
      if (typeof referenceNode.property !== 'undefined' &&
          referenceNode.property.type === 'Identifier' &&
          referenceNode.property.name === 'addEventListener') {

        if (node.arguments.length > 3) {
          let wantsUntrusted = node.arguments[3];
          switch (wantsUntrusted.type) {
            case 'Literal':
              if (wantsUntrusted.value) {
                return context.report({
                  node: node,
                  message: EVENT_LISTENER_FOURTH.code,
                });
              }
              break;
            case 'Identifier':
              referenceNode = getNodeReference(context, wantsUntrusted);
              if (referenceNode.value) {
                return context.report({
                  node: node,
                  message: EVENT_LISTENER_FOURTH.code,
                });
              }
              break;
          }
        }
      }
    },
  };
}
