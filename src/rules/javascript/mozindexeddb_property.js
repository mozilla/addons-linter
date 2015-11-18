import { MOZINDEXEDDB_PROPERTY } from 'messages';


export function mozindexeddb_property(context) {
  return {
    Identifier: function(node) {
      // Catches `var foo = 'mozIndexedDB'; var myDatabase = window[foo];`.
      if (node.parent.init && node.parent.init.value === 'mozIndexedDB') {
        return context.report(node, MOZINDEXEDDB_PROPERTY.code);
      }
    },
    MemberExpression: function(node) {
      // Catches `var foo = window.mozIndexedDB;` and
      // `var foo = window['mozIndexedDB'];`.
      if (node.property.name === 'mozIndexedDB' ||
          node.property.value === 'mozIndexedDB') {
        context.report(node, MOZINDEXEDDB_PROPERTY.code);
      }
    },
  };
}
