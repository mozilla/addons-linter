import { getAvailableMessages, isBrowserNamespace } from 'utils';
import { MESSAGE_MISSING_PLACEHOLDER_IN_DEFAULT_LOCALE } from 'messages';

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
        if (
          availableMessages.includes(message.value) &&
          node.parent.arguments.length > 1 &&
          Object.prototype.hasOwnProperty.call(
            defaultMessagesFile,
            message.value
          )
        ) {
          const messageDefinition = defaultMessagesFile[message.value];
          const placeholders =
            messageDefinition.placeholders &&
            Object.entries(messageDefinition.placeholders);
          const placeholderCount =
            (node.parent.arguments[1].type === 'ArrayExpression'
              ? node.parent.arguments[1].elements.length
              : node.parent.arguments.length) - 1;
          for (let i = 1; i <= placeholderCount; ++i) {
            const placeholderString = `$${i}`;
            if (
              !messageDefinition.message.includes(placeholderString) &&
              (!placeholders ||
                !placeholders.some((placeholder) =>
                  placeholder.content.includes(placeholderString)
                ))
            ) {
              context.report(
                node,
                MESSAGE_MISSING_PLACEHOLDER_IN_DEFAULT_LOCALE.messageFormat,
                {
                  message: message.value,
                  defaultLocale,
                  placeholder: i,
                }
              );
            }
          }
        }
      },
    };
  },
};
