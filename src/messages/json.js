import { oneLine } from 'common-tags';

import { i18n } from 'utils';

export const JSON_INVALID = {
  code: 'JSON_INVALID',
  message: i18n._('Your JSON is not valid.'),
  description: i18n._('Your JSON file could not be parsed.'),
};

export const JSON_BLOCK_COMMENTS = {
  code: 'JSON_BLOCK_COMMENTS',
  message: i18n._('Your JSON contains block comments.'),
  description: i18n._(oneLine`Only line comments (comments beginning with
    "//") are allowed in JSON files. Please remove block comments (comments
    beginning with "/*")`),
};

export const JSON_DUPLICATE_KEY = {
  code: 'JSON_DUPLICATE_KEY',
  message: i18n._('Duplicate keys are not allowed in JSON files.'),
  description: i18n._(oneLine`Duplicate key found in JSON file.`),
};
