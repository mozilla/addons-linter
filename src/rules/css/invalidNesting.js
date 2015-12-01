import * as messages from 'messages';


export function invalidNesting(cssNode, filename,
                              {startLine, startColumn}={}) {
  var messageList = [];
  if (cssNode.type === 'rule') {
    for (let node of cssNode.nodes) {
      if (node.type === 'rule') {
        messageList.push(
          Object.assign({}, messages.INVALID_SELECTOR_NESTING, {
            type: 'error',
            line: startLine,
            column: startColumn,
            file: filename,
          }));
        break;
      }
    }
  }
  return messageList;
}
