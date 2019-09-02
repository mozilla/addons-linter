import { DEPRECATED_API } from 'messages/javascript';
import { isDeprecatedApi } from 'schema/browser-apis';
import { isBrowserNamespace } from 'utils';

export default {
  create(context) {
    return {
      MemberExpression(node) {
        if (
          !node.computed &&
          node.object.object &&
          isBrowserNamespace(node.object.object.name)
        ) {
          const namespace = node.object.property.name;
          const property = node.property.name;
          const api = `${namespace}.${property}`;

          if (isDeprecatedApi(namespace, property)) {
            context.report({
              node,
              message: DEPRECATED_API.messageFormat,
              data: { api },
            });
          }
        }
      },
    };
  },
};
