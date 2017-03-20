import { UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT } from 'messages/javascript';

export const DEFLATE_COMPRESSION = 8;
export const NO_COMPRESSION = 0;

export const ESLINT_ERROR = 2;
export const ESLINT_WARNING = 1;

export const ESLINT_RULE_MAPPING = {
  'banned-identifiers': ESLINT_WARNING,
  'deprecated-entities': ESLINT_WARNING,
  'eval-string-arg': ESLINT_WARNING,
  'event-listener-fourth': ESLINT_WARNING,
  'global-require-arg': ESLINT_WARNING,
  'init-null-arg': ESLINT_WARNING,
  'low-level-module': ESLINT_WARNING,
  'mozindexeddb': ESLINT_WARNING,
  'mozindexeddb-property': ESLINT_WARNING,
  'only-prefs-in-defaults': ESLINT_WARNING,
  'opendialog-nonlit-uri': ESLINT_WARNING,
  'opendialog-remote-uri': ESLINT_WARNING,
  'shallow-wrapper': ESLINT_WARNING,
  'webextension-api': ESLINT_WARNING,
  'widget-module': ESLINT_WARNING,

  // 3rd party / eslint-internal rules
  'no-unsafe-innerhtml/no-unsafe-innerhtml': ESLINT_WARNING,
  'no-eval': [ESLINT_WARNING, {allowIndirect: false}],
};

export const ESLINT_OVERWRITE_MESSAGE = {
  'no-unsafe-innerhtml/no-unsafe-innerhtml': UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
};

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

export const RDF_DEFAULT_NAMESPACE = 'http://www.mozilla.org/2004/em-rdf#';

export const RDF_UNALLOWED_TAGS = ['hidden'];
export const RDF_UNALLOWED_IF_LISTED_TAGS = ['updateKey', 'updateURL'];
export const RDF_OBSOLETE_TAGS = ['file', 'requires', 'skin'];

export const HTML_TAGS_WITH_REQUIRED_ATTRIBUTES = {
  prefwindow: ['id'],
};

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
  PACKAGE_ANY: PACKAGE_ANY,
  PACKAGE_EXTENSION: PACKAGE_EXTENSION,
  PACKAGE_THEME: PACKAGE_THEME,
  PACKAGE_DICTIONARY: PACKAGE_DICTIONARY,
  PACKAGE_LANGPACK: PACKAGE_LANGPACK,
  PACKAGE_SEARCHPROV: PACKAGE_SEARCHPROV,
  PACKAGE_MULTI: PACKAGE_MULTI,
  PACKAGE_SUBPACKAGE: PACKAGE_SUBPACKAGE,
};

// Types from install.rdf don't match the types
// we use internally. This provides a mapping.
export const ADDON_TYPE_MAP = {
  2: PACKAGE_EXTENSION,
  4: PACKAGE_THEME,
  8: PACKAGE_LANGPACK,
  32: PACKAGE_MULTI,
  64: PACKAGE_DICTIONARY,
  // New "experiment" type: see bug 1220097
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1220583
  128: PACKAGE_EXTENSION,
};

export const LOCAL_PROTOCOLS = ['chrome:', 'resource:'];

// If you add to this you'll need to additionally
// update _BANNED_IDENTIFIERS_MAP with details in
// messages/javascript.
export const BANNED_IDENTIFIERS = [
  'newThread',
  'processNextEvent',
];

export const LOW_LEVEL_MODULES = [
  // Added from bugs 689340, 731109
  'chrome', 'window-utils', 'observer-service',
  // Added from bug 845492
  'window/utils', 'sdk/window/utils', 'sdk/deprecated/window-utils',
  'tab/utils', 'sdk/tab/utils',
  'system/events', 'sdk/system/events',
];

export const INSTALL_RDF = 'install.rdf';
export const MANIFEST_JSON = 'manifest.json';
export const CHROME_MANIFEST = 'chrome.manifest';

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
export const FLAGGED_FILE_REGEX = /thumbs\.db$|\.DS_Store$|\.orig$|\.old$|\~$/i;
export const ALREADY_SIGNED_REGEX = /^META\-INF\/manifest\.mf/;

export const FLAGGED_FILE_EXTENSION_REGEX =
  /\.exe$|\.dll$|\.dylib$|\.so$|\.sh$|\.class$|\.swf$|\.jar$/i;

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
