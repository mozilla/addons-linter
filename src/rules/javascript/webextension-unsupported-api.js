import { UNSUPPORTED_API } from 'messages/javascript';
import { hasBrowserApi } from 'schema/browser-apis';

export default {
  create(context) {
    return {
      MemberExpression: function(node) {
        if (node.object.object &&
            ['chrome', 'browser'].includes(node.object.object.name)) {
          let namespace = node.object.property.name;
          let property = node.property.name;
          let api = `${namespace}.${property}`;

          if (!hasBrowserApi(namespace, property)) {
            context.report(node, UNSUPPORTED_API.messageFormat, { api });
          }
        }
      },
    };
  },
};
