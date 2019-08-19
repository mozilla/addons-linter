import * as messages from 'messages';

export function invalidNesting(
  cssNode,
  filename,
  { startLine, startColumn } = {}
) {
  const messageList = [];
  if (cssNode.type === 'rule') {
    for (let i = 0; i < cssNode.nodes.length; i++) {
      const node = cssNode.nodes[i];
      if (node.type === 'rule') {
        messageList.push({
          ...messages.INVALID_SELECTOR_NESTING,
          type: 'warning',
          line: startLine,
          column: startColumn,
          file: filename,
        });
        break;
      }
    }
  }
  return messageList;
}
