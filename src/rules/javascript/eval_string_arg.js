import { EVAL_STRING_ARG } from 'messages/javascript';
import { getVariable } from 'utils';

export function eval_string_arg(context) {
  return {
    CallExpression: function(node) {
      // Check if what's being called is setTimeout or setInterval
      if (typeof node.callee.property !== 'undefined' &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === 'setTimeout' ||
           node.callee.property.name === 'setInterval')) {

        // If the first arg is a variable check if it's a function
        if (node.arguments.length > 0 &&
            node.arguments[0].type === 'Identifier') {
          var originalDef = getVariable(context, node.arguments[0].name);
          if (originalDef && originalDef.type &&
              originalDef.type !== 'FunctionExpression' &&
              originalDef.type !== 'ArrowFunctionExpression') {
            return context.report({node: node, message: EVAL_STRING_ARG.code});
          } else {
            return;
          }
        // Otherwise just check the type of the variable
        } else if (node.arguments.length > 0 &&
            (node.arguments[0].type !== 'FunctionExpression' &&
             node.arguments[0].type !== 'ArrowFunctionExpression')) {
          return context.report({node: node, message: EVAL_STRING_ARG.code});
        }
      }
    },
  };
}
