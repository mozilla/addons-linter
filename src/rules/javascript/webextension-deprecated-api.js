import { DEPRECATED_API } from 'messages/javascript';
import { isDeprecatedApi, hasBrowserApi } from 'schema/browser-apis';
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

          if (
            hasBrowserApi(namespace, property) &&
            isDeprecatedApi(namespace, property)
          ) {
            context.report(node, DEPRECATED_API.messageFormat, { api });
          }
        }
      },
    };
  },
};
