import { UNSUPPORTED_API } from 'messages/javascript';
import { hasBrowserApi } from 'schema/browser-apis';
import { isBrowserNamespace } from 'utils';

const rule = {
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

          if (!hasBrowserApi(namespace, property)) {
            context.report(node, UNSUPPORTED_API.messageFormat, { api });
          }
        }
      },
    };
  },
};

export default rule;
export const { create } = rule;
