import { UNEXPECTED_GLOGAL_ARG } from 'messages';
import { getVariable } from 'utils';

/*
 * This rule will detect a global passed to `require()` as the first arg
 *
 */
export function global_require_arg(context) {
  return {
    CallExpression: function(node) {
      if (node.callee.name === 'require' &&
          node.arguments &&
          node.arguments.length) {
        var firstArg = node.arguments[0];
        if (firstArg.type === 'Identifier') {
          var pathVar = getVariable(context, firstArg.name);
          if (typeof pathVar === 'undefined') {
            // We infer this is probably a global.
            return context.report(node, UNEXPECTED_GLOGAL_ARG.code);
          }
        }
      }
    },
  };
}
