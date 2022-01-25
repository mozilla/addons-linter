import { NO_DOCUMENT_WRITE } from 'messages';

const rule = {
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.type !== 'MemberExpression') {
          return;
        }

        const { object } = node.callee;

        if (object?.type !== 'Identifier' || object?.name !== 'document') {
          return;
        }

        const { property } = node.callee;

        if (property?.type !== 'Identifier' || property?.name !== 'write') {
          return;
        }

        context.report(node, NO_DOCUMENT_WRITE.code);
      },
    };
  },
};

export default rule;
export const { create } = rule;
