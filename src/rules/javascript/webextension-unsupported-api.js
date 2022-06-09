import { REMOVED_MV2_API, UNSUPPORTED_API } from 'messages/javascript';
import { hasBrowserApi, isMV2RemovedApi } from 'schema/browser-apis';
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
          const { addonMetadata, privileged } = context.settings;

          if (hasBrowserApi(namespace, property, addonMetadata)) {
            return;
          }
          if (isMV2RemovedApi(namespace, property, addonMetadata)) {
            context.report({
              node,
              message: REMOVED_MV2_API.messageFormat,
              data: { api },
            });
            return;
          }

          if (
            privileged &&
            // We should not have to test with `api` but with do because we
            // don't support nested namespaces yet, which seems common in
            // existing privileged extensions.
            //
            // See: https://github.com/mozilla/addons-linter/issues/4364
            (addonMetadata?.experimentApiPaths?.has(namespace) ||
              addonMetadata?.experimentApiPaths?.has(api))
          ) {
            return;
          }

          context.report(node, UNSUPPORTED_API.messageFormat, { api });
        }
      },
    };
  },
};

export default rule;
export const { create } = rule;
