import { isDeprecatedApi, isTemporaryApi } from 'schema/browser-apis';
import { apiToMessage } from 'utils';

export default {
  create(context) {
    return {
      MemberExpression: function(node) {
        if (node.object.object &&
            ['chrome', 'browser'].includes(node.object.object.name)) {
          let namespace = node.object.property.name;
          let property = node.property.name;
          let api = `${namespace}.${property}`;

          if (isDeprecatedApi(namespace, property)) {
            return context.report(node, apiToMessage(api));
          }

          if (!context.settings.addonMetadata.id &&
              isTemporaryApi(namespace, property)) {
            return context.report(node, apiToMessage(api));
          }
        }
      },
    };
  },
};
