import * as messages from 'messages';
import { DEPRECATED_JAVASCRIPT_APIS } from 'const';
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
            const msgId = DEPRECATED_JAVASCRIPT_APIS[api];

            const messageObject =
              // eslint-disable-next-line import/namespace
              (msgId && messages[msgId]) || messages.DEPRECATED_API;

            context.report({
              node,
              message: messageObject.messageFormat,
              data: { api },
            });
          }
        }
      },
    };
  },
};
