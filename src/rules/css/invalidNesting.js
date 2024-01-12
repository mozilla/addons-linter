import * as messages from 'messages';

import { basicCompatVersionComparisonGEQ } from '../../utils';

const CSS_NESTING_MIN_VERSION = 117;

export function invalidNesting(
  cssNode,
  filename,
  { startLine, startColumn, addonMetadata } = {}
) {
  if (
    basicCompatVersionComparisonGEQ(
      addonMetadata?.firefoxMinVersion,
      CSS_NESTING_MIN_VERSION
    )
  ) {
    return [];
  }
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
