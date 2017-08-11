import { MOZINDEXEDDB } from 'messages';

export default {
  create(context) {
    return {
      // eslint-disable-next-line consistent-return
      Identifier(node) {
        // Catches `var foo = mozIndexedDB;`.
        if (node.name === 'mozIndexedDB' &&
            node.parent.type !== 'MemberExpression') {
          return context.report(node, MOZINDEXEDDB.code);
        }
      },
    };
  },
};
