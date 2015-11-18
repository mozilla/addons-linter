import { ONLY_PREFS_IN_DEFAULTS } from 'messages/javascript';
import { getRootExpression } from 'utils';

export function only_prefs_in_defaults(context) {
  var filename = context.getFilename();

  // This rule only applies to files in defaults/preferences
  if (filename.indexOf('defaults/preferences/') === 0) {
    return {
      CallExpression: function(node) {
        var root = getRootExpression(node);

        if (root.name !== 'pref' && root.name !== 'user_pref') {
          return context.report(node, ONLY_PREFS_IN_DEFAULTS.code);
        }
      },
    };
  } else {
    return {};
  }
}
