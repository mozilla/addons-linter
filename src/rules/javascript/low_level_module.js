import { LOW_LEVEL_MODULES } from 'const';
import { LOW_LEVEL_MODULE } from 'messages';
import { getVariable } from 'utils';


/*
 * This rule will detect use of `require()` with the first arg being either
 * a literal that matches a restricted module or a var pointing to a literal
 * that matches a restricted value.
 *
 * TODO: This rule should only be run for jetpack.
 * TODO: Check what the requires_chrome feature does in the old code.
 *
 */
export function low_level_module(context) {
  return {
    CallExpression: function(node) {
      var requiresLowLevelMod = false;
      if (node.callee.name === 'require' &&
          node.arguments &&
          node.arguments.length) {

        var firstArg = node.arguments[0];

        // Find a literal string value passed to the
        // the require function.
        if (firstArg.type === 'Literal' &&
            LOW_LEVEL_MODULES.includes(firstArg.value)) {
          requiresLowLevelMod = true;
        }

        // Detect a var matching the widget module
        // being passed as the first arg of require().
        if (firstArg.type === 'Identifier') {
          var pathVar = getVariable(context, firstArg.name);
          if (pathVar && pathVar.type === 'Literal' &&
              LOW_LEVEL_MODULES.includes(pathVar.value)) {
            requiresLowLevelMod = true;
          }
        }

        if (requiresLowLevelMod) {
          return context.report(node, LOW_LEVEL_MODULE.code);
        }
      }
    },
  };
}
