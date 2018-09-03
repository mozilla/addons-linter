import { OPENDIALOG_NONLIT_URI } from 'messages';

export default {
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
            if (uri.type !== 'Literal') {
              return context.report(node, OPENDIALOG_NONLIT_URI.code);
            }
          }
        }
      },
    };
  },
};
