import * as messages from 'messages';
import { LOCAL_CSS_URL } from 'regex';


export function detectBadMozBindingURL(rule) {
  var messageList = [];
  for (let declaration of rule.declarations) {
    if (declaration.property === '-moz-binding') {
      if (LOCAL_CSS_URL.test(declaration.value) === false) {
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
