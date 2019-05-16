export const DEFLATE_COMPRESSION = 8;
export const NO_COMPRESSION = 0;

export const ESLINT_ERROR = 2;
export const ESLINT_WARNING = 1;

// 3rd party / eslint-internal rules
export const EXTERNAL_RULE_MAPPING = {
  'no-eval': [ESLINT_WARNING, { allowIndirect: false }],
  'no-implied-eval': ESLINT_WARNING,
  'no-new-func': ESLINT_WARNING,
  'no-unsafe-innerhtml/no-unsafe-innerhtml': ESLINT_WARNING,
};

export const ESLINT_RULE_MAPPING = Object.assign(
  {
    'deprecated-entities': ESLINT_WARNING,
    'event-listener-fourth': ESLINT_WARNING,
    'global-require-arg': ESLINT_WARNING,
    'opendialog-nonlit-uri': ESLINT_WARNING,
    'opendialog-remote-uri': ESLINT_WARNING,
    'webextension-api': ESLINT_WARNING,
    'webextension-unsupported-api': ESLINT_WARNING,
    'content-scripts-file-absent': ESLINT_ERROR,
    'webextension-api-compat': ESLINT_WARNING,
    'webextension-api-compat-android': ESLINT_WARNING,
  },
  EXTERNAL_RULE_MAPPING
);

export const VALIDATION_ERROR = 'error';
export const VALIDATION_NOTICE = 'notice';
export const VALIDATION_WARNING = 'warning';

export const ESLINT_TYPES = {
  0: VALIDATION_NOTICE,
  1: VALIDATION_WARNING,
  2: VALIDATION_ERROR,
};

export const MESSAGE_TYPES = [
  VALIDATION_ERROR,
  VALIDATION_NOTICE,
  VALIDATION_WARNING,
];

// Package type constants.
export const PACKAGE_ANY = 0;
export const PACKAGE_EXTENSION = 1;
export const PACKAGE_THEME = 2;
export const PACKAGE_DICTIONARY = 3;
export const PACKAGE_LANGPACK = 4;
export const PACKAGE_SEARCHPROV = 5;
export const PACKAGE_MULTI = 1; // A multi extension is an extension
export const PACKAGE_SUBPACKAGE = 7;

export const PACKAGE_TYPES = {
  PACKAGE_ANY,
  PACKAGE_EXTENSION,
  PACKAGE_THEME,
  PACKAGE_DICTIONARY,
  PACKAGE_LANGPACK,
  PACKAGE_SEARCHPROV,
  PACKAGE_MULTI,
  PACKAGE_SUBPACKAGE,
};

export const LOCAL_PROTOCOLS = ['chrome:', 'resource:'];

export const MANIFEST_JSON = 'manifest.json';

export const VALID_MANIFEST_VERSION = 2;

// The max file size in MB that the
// io classes will open as strings or streams.
export const MAX_FILE_SIZE_MB = 100;
// This is the limit in megabytes of a file we will parse (eg. CSS, JS, etc.)
// A singular CSS/JS file over 4MB seems bad and may actually be full of data
// best stored in JSON/some other data format rather than code.
// https://github.com/mozilla/addons-linter/issues/730
// We increased this limit from 2MB to 4MB as per:
// https://github.com/mozilla/addons/issues/181
//
// We should be careful about increasing this any further.
export const MAX_FILE_SIZE_TO_PARSE_MB = 4;

export const HIDDEN_FILE_REGEX = /^__MACOSX\//;
export const FLAGGED_FILE_REGEX = /thumbs\.db$|\.DS_Store$|\.orig$|\.old$|~$/i;
export const ALREADY_SIGNED_REGEX = /^META-INF\/manifest\.mf/;

export const FLAGGED_FILE_EXTENSIONS = [
  '.class',
  '.dll',
  '.dylib',
  '.exe',
  '.jar',
  '.sh',
  '.so',
  '.swf',
];

export const IMAGE_FILE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'png',
  'svg',
];

// Map the image mime to the expected file extensions
// (used in the the static theme images validation).
export const MIME_TO_FILE_EXTENSIONS = {
  'image/svg+xml': ['svg'],
  'image/gif': ['gif'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

// List of the mime types for the allowed static theme images.
export const STATIC_THEME_IMAGE_MIMES = Object.keys(MIME_TO_FILE_EXTENSIONS);

// List of the "schema data paths" of the deprecated static theme's LWT aliases.
export const DEPRECATED_STATIC_THEME_LWT_ALIASES = [
  '/theme/images/headerURL',
  '/theme/colors/accentcolor',
  '/theme/colors/textcolor',
  '/theme/colors/toolbar_text',
];

// A list of magic numbers that we won't allow.
export const FLAGGED_FILE_MAGIC_NUMBERS = [
  [0x4d, 0x5a], // EXE or DLL,
  [0x5a, 0x4d], // Alternative EXE or DLL
  [0x7f, 0x45, 0x4c, 0x46], // UNIX elf
  [0x23, 0x21], // Shell script
  [0xca, 0xfe, 0xba, 0xbe], // Java + Mach-O (dylib)
  [0xca, 0xfe, 0xd0, 0x0d], // Java packed
  [0x43, 0x57, 0x53], // Compressed SWF
];

// Based on the above, this is how deep we need to look into a file.
export const FLAGGED_FILE_MAGIC_NUMBERS_LENGTH = 4;

export const DEPRECATED_APIS = [
  'app.getDetails',
  'extension.onRequest',
  'extension.onRequestExternal',
  'extension.sendRequest',
  'tabs.getAllInWindow',
  'tabs.getSelected',
  'tabs.onActiveChanged',
  'tabs.onSelectionChanged',
  'tabs.sendRequest',
];

// These are APIs that will cause problems when loaded temporarily
// in about:debugging.
export const TEMPORARY_APIS = [
  'identity.getRedirectURL',
  'storage.local',
  'storage.sync',
];

// All valid CSP keywords that are options to keys like `default-src` and
// `script-src`. Used in manifest.json parser for validation.
// See https://mzl.la/2vwqbGU for more details and allowed options.
export const CSP_KEYWORD_RE = new RegExp(
  [
    '(self|none|unsafe-inline|strict-dynamic|unsafe-hashed-attributes)',
    // Only match these keywords, anything else is forbidden
    '(?!.)',
    '|(sha(256|384|512)-|nonce-)',
  ].join('')
);

export const MESSAGES_JSON = 'messages.json';
export const LOCALES_DIRECTORY = '_locales';

// This is a string, since it has to be matched globally on a message string.
// This should match
// https://searchfox.org/mozilla-central/rev/3abf6fa7e2a6d9a7bfb88796141b0f012e68c2db/toolkit/components/extensions/ExtensionCommon.jsm#1711
export const MESSAGE_PLACEHOLDER_REGEXP = '\\$([a-zA-Z0-9_@]+)\\$';

// yauzl should trow error with this message in case of corrupt zip file
export const ZIP_LIB_CORRUPT_FILE_ERROR =
  'end of central directory record signature not found';
