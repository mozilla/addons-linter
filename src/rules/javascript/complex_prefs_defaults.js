import { COMPLEX_PREFS_DEFAULTS } from 'messages/javascript';

export default function(context) {
  var filename = context.getFilename();

  if (filename.indexOf('defaults/preferences/') === 0) {
    return {
      CallExpression: function(node) {
        var callee = node.callee;
        var root;

        if (callee.type === 'Identifier') {
          root = callee;
        } else if (callee.type === 'MemberExpression') {
          root = callee.object;
        }

        if (root.name !== 'pref' && root.name !== 'user_pref') {
          return context.report(node, COMPLEX_PREFS_DEFAULTS.code);
        }
      },
    };
  } else {
    return {};
  }
}
