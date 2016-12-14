import { DEPRECATED_APIS, TEMPORARY_APIS } from 'const';
import { apiToMessage } from '../../utils';

export function webextension_api(context) {
  return {
    MemberExpression: function(node) {
      if (node.object.object &&
          ['chrome', 'browser'].includes(node.object.object.name)) {
        let api = `${node.object.property.name}.${node.property.name}`;

        if (DEPRECATED_APIS.includes(api)) {
          return context.report(node, apiToMessage(api));
        }

        if (!context.settings.addonMetadata.id &&
            TEMPORARY_APIS.includes(api)) {
          return context.report(node, apiToMessage(api));
        }
      }
    },
  };
}
