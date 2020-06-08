import { isTemporaryApi } from 'schema/browser-apis';
import { apiToMessage, isBrowserNamespace } from 'utils';

export default {
  create(context) {
    return {
      // eslint-disable-next-line consistent-return
      MemberExpression(node) {
        if (node.object.object && isBrowserNamespace(node.object.object.name)) {
          const namespace = node.object.property.name;
          const property = node.property.name;
          const api = `${namespace}.${property}`;

          if (
            !context.settings.addonMetadata.id &&
            isTemporaryApi(namespace, property)
          ) {
            return context.report(node, apiToMessage(api));
          }
        }
      },
    };
  },
};
