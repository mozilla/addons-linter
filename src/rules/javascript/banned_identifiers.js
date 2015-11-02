import { BANNED_IDENTIFIERS } from 'const';

export default function(context) {
  return {
    Identifier: function(node) {
      if (BANNED_IDENTIFIERS.indexOf(node.name) > -1) {
        return context.report(node, `BANNED_${node.name.toUpperCase()}`);
      }
    },
    MemberExpression: function(node) {
      if (BANNED_IDENTIFIERS.indexOf(node.property.name) > -1) {
        return context.report(node,
          `BANNED_${node.property.name.toUpperCase()}`);
      }
    },
  };
}
