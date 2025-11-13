import { UNEXPECTED_GLOBAL_ARG } from 'messages';
import { getVariable } from 'utils';

/*
 * This rule will detect a global passed to `require()` as the first argument.
 */
const rule = {
  create(context) {
    return {
      // eslint-disable-next-line consistent-return
      CallExpression(node) {
        const { variables } = context.sourceCode.getScope(node);

        if (
          node.callee.name === 'require' &&
          node.arguments &&
          node.arguments.length
        ) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Identifier') {
            const pathVar = getVariable(variables, firstArg.name);
            if (typeof pathVar === 'undefined') {
              // We infer this is probably a global.
              return context.report(node, UNEXPECTED_GLOBAL_ARG.code);
            }
          }
        }
      },
    };
  },
};

export default rule;
export const { create } = rule;
