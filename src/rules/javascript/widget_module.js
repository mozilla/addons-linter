import { DEPREC_SDK_MOD_WIDGET } from 'messages';
import { getVariable } from 'utils';

const WIDGET_PATH = 'sdk/widget';

/*
 * This rule will detect use of `require()` with the first arg being either
 * a literal that matches the widget module or var pointing at a literal.
 *
 * TODO: This rule looks to be related to compat - based on the old tests.
 * TODO: This rule should only be run for jetpack.
 *
 */
export function widget_module(context) {
  return {
    CallExpression: function(node) {
      var requiresWidgetMod = false;
      if (node.callee.name === 'require' &&
          node.arguments &&
          node.arguments.length) {

        var firstArg = node.arguments[0];

        // Find a literal string value passed to the
        // the require function.
        if (firstArg.type === 'Literal' &&
            firstArg.value === WIDGET_PATH) {
          requiresWidgetMod = true;
        }

        // Detect a var matching the widget module
        // being passed as the first arg of require().
        if (firstArg.type === 'Identifier') {
          var pathVar = getVariable(context, firstArg.name);
          if (pathVar && pathVar.type === 'Literal' &&
              pathVar.value === WIDGET_PATH) {
            requiresWidgetMod = true;
          }
        }

        if (requiresWidgetMod) {
          return context.report(node, DEPREC_SDK_MOD_WIDGET.code);
        }
      }
    },
  };
}
