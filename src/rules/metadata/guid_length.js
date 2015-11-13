import { VALIDATION_ERROR } from 'const';
import { GUID_TOO_LONG } from 'messages';


export function guidLength(metadata, filename) {
  return new Promise((resolve) => {
    var guid = metadata.guid;
    var validatorMessages = [];

    if (guid && guid.length > 255) {
      validatorMessages.push({
        code: GUID_TOO_LONG.code,
        message: GUID_TOO_LONG.message,
        description: GUID_TOO_LONG.description,
        file: filename,
        type: VALIDATION_ERROR,
      });
    }

    resolve(validatorMessages);
  });
}
