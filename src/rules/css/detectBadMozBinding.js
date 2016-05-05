import * as messages from 'messages';
import { isLocalCSSUri } from 'utils';


export function detectBadMozBindingURL(cssNode, filename,
                                       {startLine, startColumn}={}) {
  var messageList = [];
  if (cssNode.type === 'rule') {
    for (let node of cssNode.nodes) {
      if (node.prop === '-moz-binding') {
        if (isLocalCSSUri(node.value) === false) {
          messageList.push(
            Object.assign({}, messages.MOZ_BINDING_EXT_REFERENCE, {
              type: 'warning',
              line: startLine,
              column: startColumn,
              file: filename,
            }));
        }
      }
    }
  }
  return messageList;
}
