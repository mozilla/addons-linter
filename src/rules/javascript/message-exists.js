import { getAvailableMessages, isBrowserNamespace } from 'utils';
import { MESSAGE_MISSING_IN_DEFAULT_LOCALE } from 'messages';

export default {
  create(context) {
    const {
      defaultLocale,
      defaultMessagesFile,
    } = context.settings.addonMetadata;
    if (!defaultLocale) {
      return {};
    }
    const availableMessages = getAvailableMessages(defaultMessagesFile);
    return {
      MemberExpression(node) {
        if (
          !node.object.object ||
          !isBrowserNamespace(node.object.object.name)
        ) {
          // Early return when it's not our case.
          return;
        }
        const namespace = node.object.property.name;
        const property = node.property.name;
        // Namespace should be i18n function should be getMessage and it should be a call.
        // I.E. browser.i18n.getMessage().
        if (
          namespace !== 'i18n' ||
          property !== 'getMessage' ||
          node.parent.type !== 'CallExpression'
        ) {
          return;
        }
        const message = node.parent.arguments[0];
        if (message.type !== 'Literal') {
          return;
        }
        if (!availableMessages.includes(message.value)) {
          context.report(
            node,
            MESSAGE_MISSING_IN_DEFAULT_LOCALE.messageFormat,
            {
              message: message.value,
              defaultLocale,
            }
          );
        }
      },
    };
  },
};
