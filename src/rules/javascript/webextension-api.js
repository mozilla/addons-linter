import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import { apiToMessage } from '../../utils';

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

          if (DEPRECATED_APIS.includes(api)) {
            return context.report(node, apiToMessage(api));
          }

          if (!context.settings.addonMetadata.id &&
              TEMPORARY_APIS.includes(api)) {
            return context.report(node, apiToMessage(api));
          }

          if (!hasBrowserApi(namespace, property)) {
            context.report({ node, message: 'UNKNOWN_API', data: { api } });
          }
        }
      },
    };
  },
};
