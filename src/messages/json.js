import { gettext as _ } from 'utils';
import { oneLine } from 'common-tags';

export const JSON_INVALID = {
  code: 'JSON_INVALID',
  legacyCode: null,
  message: _('Your JSON is not valid.'),
  description: _('Your JSON file could not be parsed.'),
};

export const JSON_BLOCK_COMMENTS = {
  code: 'JSON_BLOCK_COMMENTS',
  legacyCode: null,
  message: _('Your JSON contains block comments.'),
  description: _(oneLine`Only line comments (comments beginning with
    "//") are allowed in JSON files. Please remove block comments (comments
    beginning with "/*")`),
};

export const JSON_DUPLICATE_KEY = {
  code: 'JSON_DUPLICATE_KEY',
  legacyCode: null,
  message: _('Duplicate keys are not allowed in JSON files.'),
  description: _(oneLine`Duplicate key found in JSON file.`),
};
