import bcd from 'mdn-browser-compat-data';

import { ANDROID_INCOMPATIBLE_API } from 'messages/javascript';
import {
  isBrowserNamespace,
  firefoxStrictMinVersion,
  isCompatible,
} from 'utils';
import { hasBrowserApi } from 'schema/browser-apis';

export default {
  create(context) {
    const minVersion =
      context.settings.addonMetadata &&
      firefoxStrictMinVersion({
        applications: {
          gecko: {
            strict_min_version:
              context.settings.addonMetadata.firefoxMinVersion,
          },
        },
      });
    if (minVersion) {
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
              !isCompatible(bcd, api, minVersion, 'firefox_android')
            ) {
              context.report(node, ANDROID_INCOMPATIBLE_API.messageFormat, {
                api,
                minVersion: context.settings.addonMetadata.firefoxMinVersion,
              });
            }
          }
        },
      };
    }
    return {};
  },
};
