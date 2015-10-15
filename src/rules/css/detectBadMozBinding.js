import * as messages from 'messages';

/*eslint-disable max-len */
export const BAD_URL_RX = /url\(['"]?(?:\/\/|(?:ht|f)tps?:\/\/|data:).*['"]?\)/i;
/*eslint-ensable max-len */

export function detectBadMozBindingURL(rule) {
  var messageList = [];
  for (let declaration of rule.declarations) {
    if (declaration.property === '-moz-binding') {
      if (BAD_URL_RX.test(declaration.value)) {
        messageList.push(Object.assign({}, messages.MOZ_BINDING_EXT_REFERENCE, {
          type: 'error',
          line: rule.position.start.line,
          column: rule.position.start.column,
          file: rule.position.source,
        }));
      }
    }
  }
  return messageList;
}
