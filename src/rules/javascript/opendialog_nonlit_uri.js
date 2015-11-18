import { OPENDIALOG_NONLIT_URI } from 'messages';


export function opendialog_nonlit_uri(context) {
  return {
    CallExpression: function(node) {
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'openDialog') {

        if (node.arguments.length) {
          var uri = node.arguments[0];
          if (uri.type !== 'Literal') {
            return context.report(node, OPENDIALOG_NONLIT_URI.code);
          }
        }
      }
    },
  };
}
