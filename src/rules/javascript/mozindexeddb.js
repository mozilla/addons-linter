import { MOZINDEXEDDB } from 'messages';

export default {
  create(context) {
    return {
      Identifier: function(node) {
        // Catches `var foo = mozIndexedDB;`.
        if (node.name === 'mozIndexedDB' &&
            node.parent.type !== 'MemberExpression') {
          return context.report(node, MOZINDEXEDDB.code);
        }
      },
    };
  },
};
