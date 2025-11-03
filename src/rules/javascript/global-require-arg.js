import { UNEXPECTED_GLOBAL_ARG } from 'messages';
import { getVariable } from 'utils';

/*
 * This rule will detect a global passed to `require()` as the first argument.
 */
const rule = {
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      // eslint-disable-next-line consistent-return
      CallExpression(node) {
        const scope = sourceCode.getScope
          ? sourceCode.getScope(node)
          : context.getScope();
        const { variables } = scope;

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
