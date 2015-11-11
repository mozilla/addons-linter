export const DEFLATE_COMPRESSION = 8;
export const NO_COMPRESSION = 0;

export const ESLINT_ERROR = 2;
export const ESLINT_WARNING = 1;

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

export const ARCH_DEFAULT = 'extension';
export const ARCH_JETPACK = 'jetpack';
export const ARCH_WEB_EXTENSION = 'webextension';

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
