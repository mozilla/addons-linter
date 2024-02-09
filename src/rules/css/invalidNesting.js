import * as messages from 'messages';

import { basicCompatVersionComparison } from '../../utils';

const CSS_NESTING_MIN_VERSION = 117;

export function invalidNesting(
  cssNode,
  filename,
  { startLine, startColumn, addonMetadata } = {}
) {
  if (
    addonMetadata?.firefoxStrictMinVersion &&
    !basicCompatVersionComparison(
      CSS_NESTING_MIN_VERSION,
      addonMetadata?.firefoxStrictMinVersion
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
