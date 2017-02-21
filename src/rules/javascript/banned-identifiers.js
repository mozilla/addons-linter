import { BANNED_IDENTIFIERS } from 'const';

export default {
  create(context) {
    return {
      Identifier: function(node) {
        if (BANNED_IDENTIFIERS.includes(node.name)) {
          return context.report(node, `BANNED_${node.name.toUpperCase()}`);
        }
      },
      MemberExpression: function(node) {
        if (BANNED_IDENTIFIERS.includes(node.property.name)) {
          return context.report(node,
            `BANNED_${node.property.name.toUpperCase()}`);
        }
      },
    };
  },
};
