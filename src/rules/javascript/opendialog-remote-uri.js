import { isLocalUrl } from 'utils';
import { OPENDIALOG_REMOTE_URI } from 'messages';

const rule = {
  create(context) {
    return {
      // eslint-disable-next-line consistent-return
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'openDialog'
        ) {
          if (node.arguments.length) {
            const uri = node.arguments[0];
            if (uri.type === 'Literal' && isLocalUrl(uri.value) === false) {
              return context.report(node, OPENDIALOG_REMOTE_URI.code);
            }
          }
        }
      },
    };
  },
};

export default rule;
export const { create } = rule;
