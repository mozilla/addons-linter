import {
  getMessagesInFile,
  getAvailableMessages,
  getColumnAndLineFromOffset,
} from 'utils';
import { VALIDATION_WARNING } from 'const';
import { missingMessageInDefaultLocale } from 'messages';

export function messageExists(
  cssNode,
  filename,
  { startLine, startColumn, addonMetadata = {} } = {}
) {
  if (!addonMetadata.defaultLocale) {
    return [];
  }
  const rawNode = cssNode.toString();
  const messages = getMessagesInFile(rawNode);
  const availableMessages = getAvailableMessages(
    addonMetadata.defaultMessagesFile
  );
  return messages
    .filter((matchInfo) => !availableMessages.includes(matchInfo.message))
    .map((matchInfo) => {
      const location = getColumnAndLineFromOffset(rawNode, matchInfo.startsAt);
      return {
        ...missingMessageInDefaultLocale(
          matchInfo.message,
          addonMetadata.defaultLocale
        ),
        type: VALIDATION_WARNING,
        line: startLine + location.line,
        column: startColumn + location.column,
        file: filename,
      };
    });
}
