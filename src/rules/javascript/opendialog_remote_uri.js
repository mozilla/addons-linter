import { isLocalUrl } from 'utils';

export default function(context) {
  return {
    CallExpression: function(node) {
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'openDialog') {

        if (node.arguments.length) {
          var uri = node.arguments[0];
          if (uri.type === 'Literal' &&
              isLocalUrl(uri.value) === false) {
            return context.report(node, 'OPENDIALOG_REMOTE_URI');
          }
        }
      }
    },
  };
}
