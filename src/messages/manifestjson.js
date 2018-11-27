import { oneLine } from 'common-tags';

import { i18n } from 'utils';
import { MANIFEST_JSON } from 'const';

export const MANIFEST_FIELD_REQUIRED = {
  code: 'MANIFEST_FIELD_REQUIRED',
  message: i18n._('The field is required.'),
  description: i18n._(
    'See https://mzl.la/1ZOhoEN (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_FIELD_INVALID = {
  code: 'MANIFEST_FIELD_INVALID',
  message: i18n._('The field is invalid.'),
  description: i18n._(
    'See https://mzl.la/1ZOhoEN (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_BAD_PERMISSION = {
  code: 'MANIFEST_BAD_PERMISSION',
  message: i18n._('The permission type is unsupported.'),
  description: i18n._(oneLine`See https://mzl.la/1R1n1t0
    (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_PERMISSIONS = {
  code: 'MANIFEST_PERMISSIONS',
  message: i18n._('Unknown permission.'),
  description: i18n._(
    'See https://mzl.la/1R1n1t0 (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_VERSION_INVALID = {
  code: 'MANIFEST_VERSION_INVALID',
  message: i18n._(
    '"manifest_version" in the manifest.json is not a valid value'
  ),
  description: i18n._(
    'See https://mzl.la/20PenXl (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_CSP = {
  // Note: don't change this 'code' without updating addons-server first, as
  // it depends on it to detect add-ons with a custom content security policy.
  code: 'MANIFEST_CSP',
  message: i18n._(oneLine`
    "content_security_policy" allows remote code execution in manifest.json`),
  description: i18n._(
    'A custom content_security_policy needs additional review.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_CSP_UNSAFE_EVAL = {
  code: 'MANIFEST_CSP_UNSAFE_EVAL',
  message: i18n._(oneLine`
    Using 'eval' has strong security and performance implications.`),
  description: i18n._(oneLine`
    In most cases the same result can be achieved differently,
    therefore it is generally prohibited`),
  file: MANIFEST_JSON,
};

export const PROP_NAME_INVALID = {
  code: 'PROP_NAME_INVALID',
  message: i18n._('The "name" property must be a string.'),
  description: i18n._(
    'See http://mzl.la/1STmr48 (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const PROP_VERSION_INVALID = {
  code: 'PROP_VERSION_INVALID',
  message: i18n._('The "version" property must be a string.'),
  description: i18n._(
    'See http://mzl.la/1kXIADa (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const PROP_VERSION_TOOLKIT_ONLY = {
  code: 'PROP_VERSION_TOOLKIT_ONLY',
  message: i18n._('The "version" property uses a Firefox-specific format.'),
  description: i18n._(
    'See http://mzl.la/1kXIADa (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_UPDATE_URL = {
  code: 'MANIFEST_UPDATE_URL',
  message: i18n._('"update_url" is not allowed.'),
  description: i18n._(oneLine`
    "applications.gecko.update_url" or
    "browser_specific_settings.gecko.update_url" are not allowed for
    Mozilla-hosted add-ons.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_UNUSED_UPDATE = {
  code: 'MANIFEST_UNUSED_UPDATE',
  message: i18n._('The "update_url" property is not used by Firefox.'),
  description: i18n._(oneLine`The "update_url" is not used by Firefox in
    the root of a manifest; your add-on will be updated via the Add-ons
    site and not your "update_url". See: https://mzl.la/25zqk4O`),
  file: MANIFEST_JSON,
};

export const STRICT_MAX_VERSION = {
  code: 'STRICT_MAX_VERSION',
  message: i18n._('"strict_max_version" not required.'),
  description: i18n._(oneLine`"strict_max_version" shouldn't be used unless
    the add-on is expected not to work with future versions of Firefox.`),
  file: MANIFEST_JSON,
};

export function manifestPropMissing(property) {
  return {
    code: `PROP_${property.toUpperCase()}_MISSING`,
    message: i18n._(`No "${property}" property found in manifest.json`),
    description: i18n._(`"${property}" is required`),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_ICON_NOT_FOUND = 'MANIFEST_ICON_NOT_FOUND';
export function manifestIconMissing(path) {
  return {
    code: MANIFEST_ICON_NOT_FOUND,
    message: i18n._(
      'An icon defined in the manifest could not be found in the package.'
    ),
    description: i18n.sprintf(
      i18n._('Icon could not be found at "%(path)s".'),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_BACKGROUND_FILE_NOT_FOUND =
  'MANIFEST_BACKGROUND_FILE_NOT_FOUND';
export function manifestBackgroundMissing(path, type) {
  return {
    code: MANIFEST_BACKGROUND_FILE_NOT_FOUND,
    legacyCode: null,
    message:
      type === 'script'
        ? i18n._(
            'A background script defined in the manifest could not be found.'
          )
        : i18n._(
            'A background page defined in the manifest could not be found.'
          ),
    description: i18n.sprintf(
      type === 'script'
        ? i18n._('Background script could not be found at "%(path)s".')
        : i18n._('Background page could not be found at "%(path)s".'),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND =
  'MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND';
export function manifestContentScriptFileMissing(path, type) {
  return {
    code: MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND,
    legacyCode: null,
    message:
      type === 'script'
        ? i18n._('A content script defined in the manifest could not be found.')
        : i18n._(
            'A content script css file defined in the manifest could not be found.'
          ),
    description: i18n.sprintf(
      type === 'script'
        ? i18n._(
            'Content script defined in the manifest could not be found at "%(path)s".'
          )
        : i18n._(
            'Content script css file defined in the manifest could not be found at "%(path)s".'
          ),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_DICT_NOT_FOUND = 'MANIFEST_DICT_NOT_FOUND';
export function manifestDictionaryFileMissing(path) {
  return {
    code: MANIFEST_DICT_NOT_FOUND,
    legacyCode: null,
    message: i18n._(
      'A dictionary file defined in the manifest could not be found.'
    ),
    description: i18n.sprintf(
      i18n._(
        'Dictionary file defined in the manifest could not be found at "%(path)s".'
      ),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_MULTIPLE_DICTS = {
  code: 'MANIFEST_MULTIPLE_DICTS',
  legacyCode: null,
  message: i18n._('The manifest contains multiple dictionaries.'),
  description: i18n._(
    'Multiple dictionaries were defined in the manifest, which is unsupported.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_EMPTY_DICTS = {
  code: 'MANIFEST_EMPTY_DICTS',
  legacyCode: null,
  message: i18n._(
    'The manifest contains a dictionaries object, but it is empty.'
  ),
  description: i18n._(
    'A dictionaries object was defined in the manifest, but it was empty.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_DICT_MISSING_ID = {
  code: 'MANIFEST_DICT_MISSING_ID',
  legacyCode: null,
  message: i18n._('The manifest contains a dictionary but no id property.'),
  description: i18n._(
    'A dictionary was found in the manifest, but there was no id set.'
  ),
  file: MANIFEST_JSON,
};

// https://github.com/mozilla/addons-linter/issues/1650
// Potentially temporary
export const MANIFEST_INVALID_CONTENT = {
  code: 'MANIFEST_INVALID_CONTENT',
  message: i18n._('Forbidden content found in add-on.'),
  description: i18n._('This add-on contains forbidden content.'),
  file: MANIFEST_JSON,
};

export const ICON_NOT_SQUARE = 'ICON_NOT_SQUARE';
export function iconIsNotSquare(path) {
  return {
    code: ICON_NOT_SQUARE,
    message: i18n._('Icons must be square.'),
    description: i18n.sprintf(i18n._('Icon at "%(path)s" must be square.'), {
      path,
    }),
    file: MANIFEST_JSON,
  };
}

export const ICON_SIZE_INVALID = 'ICON_SIZE_INVALID';
export function iconSizeInvalid({ path, expected, actual }) {
  return {
    code: ICON_SIZE_INVALID,
    message: i18n._('The size of the icon does not match the manifest.'),
    description: i18n.sprintf(
      i18n._(oneLine`
      Expected icon at "%(path)s" to be %(expected)d pixels wide but was %(actual)d.
    `),
      { path, expected, actual }
    ),
    file: MANIFEST_JSON,
  };
}

export const CORRUPT_ICON_FILE = 'CORRUPT_ICON_FILE';
export function corruptIconFile({ path }) {
  return {
    code: CORRUPT_ICON_FILE,
    message: i18n._('Corrupt image file'),
    description: i18n.sprintf(
      i18n._('Expected icon file at "%(path)s" is corrupted'),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_THEME_IMAGE_NOT_FOUND = 'MANIFEST_THEME_IMAGE_NOT_FOUND';
export function manifestThemeImageMissing(path, type) {
  return {
    code: MANIFEST_THEME_IMAGE_NOT_FOUND,
    message: i18n.sprintf(
      'Theme image for "%(type)s" could not be found in the package',
      { type }
    ),
    description: i18n.sprintf(
      i18n._('Theme image for "%(type)s" could not be found at "%(path)s"'),
      { path, type }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_THEME_IMAGE_CORRUPTED = 'MANIFEST_THEME_IMAGE_CORRUPTED';
export function manifestThemeImageCorrupted({ path }) {
  return {
    code: MANIFEST_THEME_IMAGE_CORRUPTED,
    message: i18n._('Corrupted theme image file'),
    description: i18n.sprintf(
      i18n._('Theme image file at "%(path)s" is corrupted'),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_THEME_IMAGE_WRONG_EXT = 'MANIFEST_THEME_IMAGE_WRONG_EXT';
export function manifestThemeImageWrongExtension({ path }) {
  return {
    code: MANIFEST_THEME_IMAGE_WRONG_EXT,
    message: i18n._('Theme image file has an unsupported file extension'),
    description: i18n.sprintf(
      i18n._(
        'Theme image file at "%(path)s" has an unsupported file extension'
      ),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_THEME_IMAGE_WRONG_MIME =
  'MANIFEST_THEME_IMAGE_WRONG_MIME';
export function manifestThemeImageWrongMime({ path, mime }) {
  return {
    code: MANIFEST_THEME_IMAGE_WRONG_MIME,
    message: i18n._('Theme image file has an unsupported mime type'),
    description: i18n.sprintf(
      i18n._(
        'Theme image file at "%(path)s" has the unsupported mime type "%(mime)s"'
      ),
      { path, mime }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_THEME_IMAGE_MIME_MISMATCH =
  'MANIFEST_THEME_IMAGE_MIME_MISMATCH';
export function manifestThemeImageMimeMismatch({ path, mime }) {
  return {
    code: MANIFEST_THEME_IMAGE_MIME_MISMATCH,
    message: i18n._(
      'Theme image file mime type does not match its file extension'
    ),
    description: i18n.sprintf(
      i18n._(
        'Theme image file extension at "%(path)s" does not match its actual mime type "%(mime)s"'
      ),
      { path, mime }
    ),
    file: MANIFEST_JSON,
  };
}

export const PROP_NAME_MISSING = manifestPropMissing('name');
export const PROP_VERSION_MISSING = manifestPropMissing('version');

export const NO_MESSAGES_FILE = {
  code: 'NO_MESSAGES_FILE',
  message: i18n._('The "default_locale" is missing localizations.'),
  description: i18n._(oneLine`The "default_locale" value is specified in
    the manifest, but no matching "messages.json" in the "_locales" directory
    exists. See: https://mzl.la/2hjcaEE`),
  file: MANIFEST_JSON,
};

export const NO_DEFAULT_LOCALE = {
  code: 'NO_DEFAULT_LOCALE',
  message: i18n._('The "default_locale" is missing but "_locales" exist.'),
  description: i18n._(oneLine`The "default_locale" value is not specifed in
    the manifest, but a "_locales" directory exists.
    See: https://mzl.la/2hjcaEE`),
  file: MANIFEST_JSON,
};

export const WRONG_ICON_EXTENSION = {
  code: 'WRONG_ICON_EXTENSION',
  message: i18n._('Unsupported image extension'),
  description: i18n._(
    'Icons should be one of JPG/JPEG, WebP, GIF, PNG or SVG.'
  ),
  file: MANIFEST_JSON,
};

export const NO_MESSAGES_FILE_IN_LOCALES = 'NO_MESSAGES_FILE_IN_LOCALES';
export function noMessagesFileInLocales(path) {
  return {
    code: NO_MESSAGES_FILE_IN_LOCALES,
    message: i18n._('Empty language directory'),
    description: i18n.sprintf(
      i18n._('messages.json file missing in "%(path)s"'),
      { path }
    ),
    file: MANIFEST_JSON,
  };
}
