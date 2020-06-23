import { EVENT_LISTENER_FOURTH } from 'messages/javascript';
import { getNodeReference } from 'utils';

const rule = {
  create(context) {
    return {
      // eslint-disable-next-line consistent-return
      CallExpression(node) {
        let referenceNode = getNodeReference(context, node.callee);
        if (
          typeof referenceNode.property !== 'undefined' &&
          referenceNode.property.type === 'Identifier' &&
          referenceNode.property.name === 'addEventListener'
        ) {
          if (node.arguments.length > 3) {
            const wantsUntrusted = node.arguments[3];
            if (wantsUntrusted.type === 'Literal') {
              if (wantsUntrusted.value) {
                return context.report({
                  node,
                  message: EVENT_LISTENER_FOURTH.code,
                });
              }
            } else if (wantsUntrusted.type === 'Identifier') {
              referenceNode = getNodeReference(context, wantsUntrusted);
              if (referenceNode.value) {
                return context.report({
                  node,
                  message: EVENT_LISTENER_FOURTH.code,
                });
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
export const { create } = rule;
