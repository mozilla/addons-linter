import { i18n, errorParamsToUnsupportedVersionRange } from 'utils';
import { MANIFEST_JSON, PERMS_DATAPATH_REGEX } from 'const';

const PRIVILEGED_EXTENSION_SIGNING_DOCS = i18n._(`
  Please refer to https://github.com/mozilla-extensions/xpi-manifest to learn more about privileged extensions and signing.
`);

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

export const MANIFEST_V3_FIREFOX_ANDROID_LIMITATIONS = {
  code: 'MANIFEST_V3_FIREFOX_ANDROID_LIMITATIONS',
  message: i18n._(
    'Manifest Version 3 is not fully supported on Firefox for Android.'
  ),
  // TODO(#5110): replace description with a message including a shorted
  // link to a documentation page.
  description: i18n._(
    'Manifest Version 3 is not fully supported on Firefox for Android.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_FIELD_PRIVILEGEDONLY = 'MANIFEST_FIELD_PRIVILEGEDONLY';
export function manifestFieldPrivilegedOnly(fieldName) {
  return {
    code: MANIFEST_FIELD_PRIVILEGEDONLY,
    message: i18n.sprintf(
      i18n._(`"%(fieldName)s" is ignored for non-privileged add-ons.`),
      { fieldName }
    ),
    description: i18n.sprintf(
      i18n._(`"%(fieldName)s" manifest field is only used for privileged and
        temporarily installed extensions.`),
      { fieldName }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_FIELD_UNSUPPORTED = 'MANIFEST_FIELD_UNSUPPORTED';
export function manifestFieldUnsupported(fieldName, error) {
  const versionRange = error
    ? errorParamsToUnsupportedVersionRange(error.params)
    : null;
  const messageTmpl = versionRange
    ? i18n._(`"%(fieldName)s" is not supported in manifest versions
        %(versionRange)s.`)
    : i18n._(`"%(fieldName)s" is not supported.`);
  const message = i18n.sprintf(messageTmpl, { fieldName, versionRange });

  return {
    code: MANIFEST_FIELD_UNSUPPORTED,
    message,
    description: message,
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_FIELD_PRIVILEGED = 'MANIFEST_FIELD_PRIVILEGED';
export function manifestFieldPrivileged(error) {
  const messageTmpl = i18n._(`%(instancePath)s: privileged manifest fields
                     are only allowed in privileged extensions.`);
  const message = i18n.sprintf(messageTmpl, {
    instancePath: error.instancePath,
  });

  return {
    code: MANIFEST_FIELD_PRIVILEGED,
    message,
    description: PRIVILEGED_EXTENSION_SIGNING_DOCS,
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_PERMISSION_UNSUPPORTED =
  'MANIFEST_PERMISSION_UNSUPPORTED';
export function manifestPermissionUnsupported(permissionName, error) {
  const versionRange = errorParamsToUnsupportedVersionRange(error.params);
  const messageTmpl = versionRange
    ? i18n._(`/%(fieldName)s: "%(permissionName)s" is not supported in
                     manifest versions %(versionRange)s.`)
    : i18n._(`/%(fieldName)s: "%(permissionName)s" is not supported.`);
  const message = i18n.sprintf(messageTmpl, {
    permissionName,
    versionRange,
    fieldName: error.instancePath.match(PERMS_DATAPATH_REGEX)[1],
  });

  return {
    code: MANIFEST_PERMISSION_UNSUPPORTED,
    message,
    description: message,
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_BAD_PERMISSION = {
  code: 'MANIFEST_BAD_PERMISSION',
  message: i18n._('The permission type is unsupported.'),
  description: i18n._(`See https://mzl.la/1R1n1t0
    (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_BAD_OPTIONAL_PERMISSION = {
  code: 'MANIFEST_BAD_OPTIONAL_PERMISSION',
  message: i18n._('The permission type is unsupported.'),
  description: i18n._(`See https://mzl.la/2Qn0fWC
    (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_BAD_HOST_PERMISSION = {
  code: 'MANIFEST_BAD_HOST_PERMISSION',
  message: i18n._('The permission type is unsupported.'),
  description: i18n._(
    'See https://mzl.la/3Woeqv4 (MDN Docs) for more information.'
  ),
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

export const MANIFEST_PERMISSIONS_PRIVILEGED =
  'MANIFEST_PERMISSIONS_PRIVILEGED';
export function manifestPermissionsPrivileged(error) {
  const messageTmpl =
    i18n._(`%(instancePath)s: the following privileged permissions
                     are only allowed in privileged extensions:
                     %(privilegedPermissions)s.`);
  const message = i18n.sprintf(messageTmpl, {
    instancePath: error.instancePath,
    privilegedPermissions: JSON.stringify(error.params.privilegedPermissions),
  });

  return {
    code: MANIFEST_PERMISSIONS_PRIVILEGED,
    message,
    description: PRIVILEGED_EXTENSION_SIGNING_DOCS,
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_OPTIONAL_PERMISSIONS = {
  code: 'MANIFEST_OPTIONAL_PERMISSIONS',
  message: i18n._('Unknown permission.'),
  description: i18n._(
    'See https://mzl.la/2Qn0fWC (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_HOST_PERMISSIONS = {
  code: 'MANIFEST_HOST_PERMISSIONS',
  message: i18n._('Invalid host permission.'),
  description: i18n._(
    'See https://mzl.la/3Woeqv4 (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_INSTALL_ORIGINS = {
  code: 'MANIFEST_INSTALL_ORIGINS',
  message: i18n._('Invalid install origin.'),
  description: i18n._(`Invalid install origin. A valid origin has - only
    - a scheme, hostname and optional port. See https://mzl.la/3TEbqbE (MDN
    Docs) for more information.`),
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

export const MANIFEST_CSP = 'MANIFEST_CSP';
export function manifestCsp(property) {
  return {
    // Note: don't change this 'code' without updating addons-server first, as
    // it depends on it to detect add-ons with a custom content security policy.
    code: MANIFEST_CSP,
    message: i18n.sprintf(
      i18n._(`"%(property)s" allows remote code execution in manifest.json`),
      { property }
    ),
    description: i18n.sprintf(
      i18n._(`A custom "%(property)s" needs additional review.`),
      { property }
    ),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_CSP_UNSAFE_EVAL = 'MANIFEST_CSP_UNSAFE_EVAL';
export function manifestCspUnsafeEval(property) {
  return {
    code: MANIFEST_CSP_UNSAFE_EVAL,
    message: i18n.sprintf(
      i18n._(`"%(property)s" allows 'eval', which has strong security and
        performance implications.`),
      { property }
    ),
    description: i18n._(`In most cases the same result can be achieved
      differently, therefore it is generally prohibited`),
    file: MANIFEST_JSON,
  };
}

export const PROP_NAME_INVALID = {
  code: 'PROP_NAME_INVALID',
  message: i18n._(
    'The "name" property must be a string with no leading/trailing whitespaces.'
  ),
  description: i18n._(
    'See http://mzl.la/1STmr48 (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

export const MANIFEST_UPDATE_URL = {
  code: 'MANIFEST_UPDATE_URL',
  message: i18n._('"update_url" is not allowed.'),
  description: i18n._(`
    "applications.gecko.update_url" or
    "browser_specific_settings.gecko.update_url" are not allowed for
    Mozilla-hosted add-ons.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_UNUSED_UPDATE = {
  code: 'MANIFEST_UNUSED_UPDATE',
  message: i18n._('The "update_url" property is not used by Firefox.'),
  description: i18n._(`The "update_url" is not used by Firefox in
    the root of a manifest; your add-on will be updated via the Add-ons
    site and not your "update_url". See: https://mzl.la/25zqk4O`),
  file: MANIFEST_JSON,
};

export const STRICT_MAX_VERSION = {
  code: 'STRICT_MAX_VERSION',
  message: i18n._('"strict_max_version" not required.'),
  description: i18n._(`"strict_max_version" shouldn't be used unless
    the add-on is expected not to work with future versions of Firefox.`),
  file: MANIFEST_JSON,
};

export function manifestPropMissing(property) {
  return {
    code: `PROP_${property.toUpperCase()}_MISSING`,
    message: i18n.sprintf(
      i18n._(`No "%(property)s" property found in manifest.json`),
      { property }
    ),
    description: i18n.sprintf(i18n._(`"%(property)s" is required`), {
      property,
    }),
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
      i18n._(`
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

export const MANIFEST_FIELD_DEPRECATED = {
  code: 'MANIFEST_FIELD_DEPRECATED',
  message: i18n._('This property has been deprecated.'),
  description: null,
  file: MANIFEST_JSON,
};

export const MANIFEST_THEME_LWT_ALIAS = {
  code: 'MANIFEST_THEME_LWT_ALIAS',
  message: i18n._('This theme LWT alias has been removed in Firefox 70.'),
  description: i18n._(
    'See https://mzl.la/2T11Lkc (MDN Docs) for more information.'
  ),
  file: MANIFEST_JSON,
};

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

export const NO_MESSAGES_FILE = {
  code: 'NO_MESSAGES_FILE',
  message: i18n._('The "default_locale" is missing localizations.'),
  description: i18n._(`The "default_locale" value is specified in
    the manifest, but no matching "messages.json" in the "_locales" directory
    exists. See: https://mzl.la/2hjcaEE`),
  file: MANIFEST_JSON,
};

export const NO_DEFAULT_LOCALE = {
  code: 'NO_DEFAULT_LOCALE',
  message: i18n._('The "default_locale" is missing but "_locales" exist.'),
  description: i18n._(`The "default_locale" value is not specifed in
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

export const IGNORED_APPLICATIONS_PROPERTY = {
  code: 'IGNORED_APPLICATIONS_PROPERTY',
  message: i18n._(
    '"applications" property overridden by "browser_specific_settings" property'
  ),
  description: i18n._(
    `The "applications" property is being ignored because it is superseded by the "browser_specific_settings" property which is also defined in your manifest. Consider removing applications.`
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

export const KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION =
  'KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION';
export function keyFirefoxUnsupportedByMinVersion(
  key,
  minVersion,
  versionAdded
) {
  return {
    code: KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION,
    message: i18n._(
      'Manifest key not supported by the specified minimum Firefox version'
    ),
    description: i18n.sprintf(
      i18n._(`"strict_min_version" requires Firefox %(minVersion)s, which
        was released before version %(versionAdded)s introduced support for
        "%(key)s".`),
      { key, minVersion, versionAdded }
    ),
    file: MANIFEST_JSON,
  };
}

export const PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION =
  'PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION';
export function permissionFirefoxUnsupportedByMinVersion(
  key,
  minVersion,
  versionAdded
) {
  return {
    code: PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION,
    message: i18n._(
      'Permission not supported by the specified minimum Firefox version'
    ),
    description: i18n.sprintf(
      i18n._(`"strict_min_version" requires Firefox %(minVersion)s, which
        was released before version %(versionAdded)s introduced support for
        "%(key)s".`),
      { key, minVersion, versionAdded }
    ),
    file: MANIFEST_JSON,
  };
}

export const KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION =
  'KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION';
export function keyFirefoxAndroidUnsupportedByMinVersion(
  key,
  minVersion,
  versionAdded
) {
  return {
    code: KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION,
    message: i18n._(
      'Manifest key not supported by the specified minimum Firefox for Android version'
    ),
    description: i18n.sprintf(
      i18n._(`"strict_min_version" requires Firefox for Android
        %(minVersion)s, which was released before version %(versionAdded)s
        introduced support for "%(key)s".`),
      { key, minVersion, versionAdded }
    ),
    file: MANIFEST_JSON,
  };
}

export const PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION =
  'PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION';
export function permissionFirefoxAndroidUnsupportedByMinVersion(
  key,
  minVersion,
  versionAdded
) {
  return {
    code: PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION,
    message: i18n._(
      'Permission not supported by the specified minimum Firefox for Android version'
    ),
    description: i18n.sprintf(
      i18n._(`"strict_min_version" requires Firefox for Android
        %(minVersion)s, which was released before version %(versionAdded)s
        introduced support for "%(key)s".`),
      { key, minVersion, versionAdded }
    ),
    file: MANIFEST_JSON,
  };
}

export const RESTRICTED_HOMEPAGE_URL = {
  code: 'RESTRICTED_HOMEPAGE_URL',
  message: i18n._('Linking to "addons.mozilla.org" is not allowed'),
  description: i18n._(
    'Links directing to "addons.mozilla.org" are not allowed to be used for homepage'
  ),
  file: MANIFEST_JSON,
};

export const RESTRICTED_PERMISSION = 'RESTRICTED_PERMISSION';

export const makeRestrictedPermission = (permission, minFirefoxVersion) => {
  return {
    code: RESTRICTED_PERMISSION,
    message: i18n.sprintf(
      i18n._(`The "%(permission)s" permission requires
        "strict_min_version" to be set to "%(minFirefoxVersion)s" or above`),
      { permission, minFirefoxVersion }
    ),
    description: i18n.sprintf(
      i18n._(`The "%(permission)s" permission requires
        "strict_min_version" to be set to "%(minFirefoxVersion)s" or above.
        Please update your manifest.json version to specify a minimum Firefox
        version.`),
      { permission, minFirefoxVersion }
    ),
    file: MANIFEST_JSON,
  };
};

export const EXTENSION_ID_REQUIRED = {
  code: 'EXTENSION_ID_REQUIRED',
  message: i18n._(
    'The extension ID is required in Manifest Version 3 and above.'
  ),
  description: i18n._('See https://mzl.la/3PLZYdo for more information.'),
  file: MANIFEST_JSON,
};

export const PRIVILEGED_FEATURES_REQUIRED = 'PRIVILEGED_FEATURES_REQUIRED';
export function privilegedFeaturesRequired(error) {
  const messageTmpl = i18n._(
    `%(instancePath)s: Privileged extensions should declare privileged permissions.`
  );

  const message = i18n.sprintf(messageTmpl, {
    instancePath: error.instancePath,
  });

  return {
    code: PRIVILEGED_FEATURES_REQUIRED,
    message,
    description: i18n._(`
      This extension does not declare any privileged permission. It does not need to be signed with the privileged certificate.
      Please upload it directly to https://addons.mozilla.org/.
    `),
    file: MANIFEST_JSON,
  };
}

export const MOZILLA_ADDONS_PERMISSION_REQUIRED =
  'MOZILLA_ADDONS_PERMISSION_REQUIRED';
export function mozillaAddonsPermissionRequired(error) {
  const messageTmpl =
    error.instancePath === '/permissions'
      ? i18n._(
          `%(instancePath)s: The "mozillaAddons" permission is required for privileged extensions.`
        )
      : i18n._(
          `%(instancePath)s: The "mozillaAddons" permission is required for extensions that include privileged manifest fields.`
        );

  const message = i18n.sprintf(messageTmpl, {
    instancePath: error.instancePath,
  });

  return {
    code: MOZILLA_ADDONS_PERMISSION_REQUIRED,
    message,
    description:
      error.instancePath === '/permissions'
        ? i18n._(
            `This extension does not include the "mozillaAddons" permission, which is required for privileged extensions.`
          )
        : message,
    file: MANIFEST_JSON,
  };
}

export const HIDDEN_NO_ACTION = {
  code: 'HIDDEN_NO_ACTION',
  message: i18n._('Cannot use actions in hidden add-ons.'),
  description: i18n._(`The hidden and browser_action/page_action (or
    action in Manifest Version 3 and above) properties are mutually
    exclusive.`),
  file: MANIFEST_JSON,
};

export const APPLICATIONS_DEPRECATED = {
  code: 'APPLICATIONS_DEPRECATED',
  message: i18n._('Use "browser_specific_settings" instead of "applications".'),
  description: i18n._(`The "applications" property in the manifest is
    deprecated and will no longer be accepted in Manifest Version 3 and
    above.`),
  file: MANIFEST_JSON,
};

export const APPLICATIONS_INVALID = {
  code: 'APPLICATIONS_INVALID',
  message: i18n._(`"applications" is no longer allowed in Manifest
    Version 3 and above.`),
  description: i18n._(`The "applications" property in the manifest is
    no longer allowed in Manifest Version 3 and above. Use
    "browser_specific_settings" instead.`),
  file: MANIFEST_JSON,
};

export const VERSION_FORMAT_DEPRECATED = {
  code: 'VERSION_FORMAT_DEPRECATED',
  message: i18n._(`The version string should be simplified because it
    won't be compatible with Manifest Version 3 and above.`),
  description: i18n._(`The version should be a string with 1 to 4
    numbers separated with dots. Each number should have up to 9 digits and
    leading zeros will no longer be allowed. Letters will no longer be allowed
    either. See https://mzl.la/3h3mCRu (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const VERSION_FORMAT_INVALID = {
  code: 'VERSION_FORMAT_INVALID',
  message: i18n._('The version string should be simplified.'),
  description: i18n._(`The version should be a string with 1 to 4
    numbers separated with dots. Each number should have up to 9 digits and
    leading zeros are not allowed. Letters are no longer allowed. See
    https://mzl.la/3h3mCRu (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const INCOGNITO_SPLIT_UNSUPPORTED = {
  code: 'INCOGNITO_SPLIT_UNSUPPORTED',
  message: i18n._('incognito "split" is unsupported.'),
  description: i18n._(`The incognito "split" value is unsupported and will be
    treated as "not_allowed" in Firefox. Remove the key from the manifest
    file, if your extension is compatible with Firefox's private browsing mode.`),
  file: MANIFEST_JSON,
};
