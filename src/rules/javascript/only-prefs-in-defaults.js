import path from 'path';

import { ONLY_PREFS_IN_DEFAULTS } from 'messages/javascript';
import { getRootExpression } from 'utils';


export default {
  create(context) {
    var relPath = path.relative(process.cwd(), context.getFilename());

    // This rule only applies to files in defaults/preferences
    if (path.dirname(relPath).startsWith('defaults/preferences')) {
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
  },
};
