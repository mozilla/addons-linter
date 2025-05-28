export const ESLINT_ERROR = 2;
export const ESLINT_WARNING = 1;

const NO_UNSANITIZED_OPTIONS = {
  variableTracing: false,
  // Disable escapers (Sanitizer.escapeHTML, escapeHTML) and unwrappers
  // (Sanitizer.unwrapSafeHTML, unwrapSafeHTML) which are allowed by default by
  // this plugin.
  escape: { taggedTemplates: [], methods: [] },
};

const NO_UNSANITIZED_METHOD_CUSTOMIZATIONS = {
  import: {
    escape: {
      methods: ['chrome.runtime.getURL', 'browser.runtime.getURL'],
    },
    // NOTE: Alternatively using the following option would instead
    // configure the plugin to consider any method call as allowed
    // on dynamic import calls:
    //
    // objectMatches: [],
  },
};

// 3rd party / eslint-internal rules
export const EXTERNAL_RULE_MAPPING = {
  'no-eval': [ESLINT_WARNING, { allowIndirect: false }],
  'no-implied-eval': ESLINT_WARNING,
  'no-new-func': ESLINT_WARNING,
  'no-unsanitized/method': [
    ESLINT_WARNING,
    NO_UNSANITIZED_OPTIONS,
    NO_UNSANITIZED_METHOD_CUSTOMIZATIONS,
  ],
  'no-unsanitized/property': [ESLINT_WARNING, NO_UNSANITIZED_OPTIONS],
};

export const ESLINT_RULE_MAPPING = {
  'global-require-arg': ESLINT_WARNING,
  'no-document-write': ESLINT_WARNING,
  'opendialog-nonlit-uri': ESLINT_WARNING,
  'opendialog-remote-uri': ESLINT_WARNING,
  'webextension-api': ESLINT_WARNING,
  'webextension-deprecated-api': ESLINT_WARNING,
  'webextension-unsupported-api': ESLINT_WARNING,
  'content-scripts-file-absent': ESLINT_ERROR,
  'webextension-api-compat': ESLINT_WARNING,
  'webextension-api-compat-android': ESLINT_WARNING,
  ...EXTERNAL_RULE_MAPPING,
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

// The manifest_version value to use to complete the validation if an explicit one
// was missing from the extension manifest.json (but we will still be collecting the
// error for the missing manifest_version property, because it is mandatory).
export const MANIFEST_VERSION_DEFAULT = 2;

// Default min/max_manifest_version values used for schema definitions that do not
// have an explicit one on their own.
export const MANIFEST_VERSION_MIN = 2;
export const MANIFEST_VERSION_MAX = 3;

// This is the limit in megabytes of a file we will parse (eg. CSS, JS, etc.)
// A singular CSS/JS file over 5MB seems bad and may actually be full of data
// best stored in JSON/some other data format rather than code.
// https://github.com/mozilla/addons-linter/issues/730
// We increased this limit from 2MB to 4MB as per:
// https://github.com/mozilla/addons/issues/181
// Then from 4MB to 5MB in https://github.com/mozilla/addons-linter/issues/4942
//
// We should be careful about increasing this any further.
export const MAX_FILE_SIZE_TO_PARSE_MB = 5;

export const HIDDEN_FILE_REGEX = /^__MACOSX\//;
export const FLAGGED_FILE_REGEX = /thumbs\.db$|\.DS_Store$|\.orig$|\.old$|~$/i;
export const ALREADY_SIGNED_REGEX = /^META-INF\/manifest\.mf/;
export const PERMS_DATAPATH_REGEX =
  /^\/(permissions|optional_permissions|host_permissions)\/([\d+])/;
export const INSTALL_ORIGINS_DATAPATH_REGEX = /^\/(install_origins)\/([\d+])/;

export const RESERVED_FILENAMES = ['mozilla-recommendation.json'];

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

export const FILE_EXTENSIONS_TO_MIME = {
  svg: 'image/svg+xml',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

// Unique list of mime types for the allowed static theme images.
export const STATIC_THEME_IMAGE_MIMES = [
  ...new Set(Object.values(FILE_EXTENSIONS_TO_MIME)),
];

// Mapping of "schema data paths" of the deprecated properties that we
// issue warnings for.
// If the value is `null` we will be using the `deprecated` message
// from the schema. Otherwise `code`, `message` and `description` will be taken
// from the object provided.
// Note that we have to use the constants name as we can't import
// the message object here.
export const DEPRECATED_MANIFEST_PROPERTIES = {
  '/theme/images/headerURL': 'MANIFEST_THEME_LWT_ALIAS',
  '/theme/colors/accentcolor': 'MANIFEST_THEME_LWT_ALIAS',
  '/theme/colors/textcolor': 'MANIFEST_THEME_LWT_ALIAS',
};

// Mapping of deprecated javascript apis.
// If the value is `null` we will be using the `deprecated` message
// from the schema. Otherwise `code`, `message` and `description` will be taken
// from the object provided.
// Note that we have to use the constants name as we can't import
// the message object here.
export const DEPRECATED_JAVASCRIPT_APIS = {
  // These APIs were already deprecated by Chrome and Firefox never
  // supported them. We do still issue deprecation warnings for them.
  'app.getDetails': 'DEPRECATED_CHROME_API',
  'extension.onRequest': 'DEPRECATED_CHROME_API',
  'extension.onRequestExternal': 'DEPRECATED_CHROME_API',
  'extension.sendRequest': 'DEPRECATED_CHROME_API',
  'tabs.getAllInWindow': 'DEPRECATED_CHROME_API',
  'tabs.getSelected': 'DEPRECATED_CHROME_API',
  'tabs.onActiveChanged': 'DEPRECATED_CHROME_API',
  'tabs.onSelectionChanged': 'DEPRECATED_CHROME_API',
  'tabs.sendRequest': 'DEPRECATED_CHROME_API',

  // https://github.com/mozilla/addons-linter/issues/2556
  'proxy.register': 'DEPRECATED_API',
  'proxy.unregister': 'DEPRECATED_API',
  'proxy.onProxyError': 'DEPRECATED_API',
  'proxy.registerProxyScript': 'DEPRECATED_API',
};

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

// These are APIs that will cause problems when loaded temporarily
// in about:debugging.
// APIs listed here should be defined in https://mzl.la/31p4AMc
export const TEMPORARY_APIS = [
  'identity.getRedirectURL',
  'storage.sync',
  'storage.managed',
  'runtime.onMessageExternal',
  'runtime.onConnectExternal',
];

// All valid CSP keywords that are options to keys like `default-src` and
// `script-src`. Used in manifest.json parser for validation.
// See https://mzl.la/2vwqbGU for more details and allowed options.
export const CSP_KEYWORD_RE =
  /^'(self|none|wasm-unsafe-eval)'$|^moz-extension:/;

export const MESSAGES_JSON = 'messages.json';
export const LOCALES_DIRECTORY = '_locales';

// This is a string, since it has to be matched globally on a message string.
// This should match
// https://searchfox.org/mozilla-central/rev/3abf6fa7e2a6d9a7bfb88796141b0f012e68c2db/toolkit/components/extensions/ExtensionCommon.jsm#1711
export const MESSAGE_PLACEHOLDER_REGEXP = '\\$([a-zA-Z0-9_@]+)\\$';

// yauzl should trow error with this message in case of corrupt zip file
export const ZIP_LIB_CORRUPT_FILE_ERROR =
  'end of central directory record signature not found';

// URLs in this array are restricted from being used in the manifest.json "homepage_url" prperty
export const RESTRICTED_HOMEPAGE_URLS = [
  'addons-dev.allizom.org',
  'addons.mozilla.org',
];

// This map should contain entries with a permission name as key and a min
// Firefox version as value (both string values).
export const RESTRICTED_PERMISSIONS = new Map([
  // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1733159
  ['proxy', '91.1.0'],
]);

export const SCHEMA_KEYWORDS_CUSTOM = {
  MIN_MANIFEST_VERSION: 'min_manifest_version',
  MAX_MANIFEST_VERSION: 'max_manifest_version',
  PRIVILEGED: 'privileged',
  // This custom keyword doesn't exist on the Firefox side, but it is injected into the
  // schema data as part of the schema data inmport and used by the linter to hook up
  // custom validation logic for privileged permissions.
  VALIDATE_PRIVILEGED_PERMISSIONS: 'validatePrivilegedPermissions',
};

export const SCHEMA_KEYWORDS = {
  // Keywords defined in the JSON schema specs.
  ANY_OF: 'anyOf',
  DEPRECATED: 'deprecated',
  REQUIRED: 'required',
  TYPE: 'type',
  MIN_PROPERTIES: 'minProperties',
  // Non-standard JSONSchema keywords (defined and used by the Firefox and/or addons-linter).
  ...SCHEMA_KEYWORDS_CUSTOM,
};
