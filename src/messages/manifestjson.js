import { gettext as _, singleLineString, sprintf } from 'utils';
import * as constants from 'const';

const { MANIFEST_JSON } = constants;


export const MANIFEST_FIELD_REQUIRED = {
  code: 'MANIFEST_FIELD_REQUIRED',
  legacyCode: null,
  message: _('The field is required.'),
  description: _('See https://mzl.la/1ZOhoEN (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_FIELD_INVALID = {
  code: 'MANIFEST_FIELD_INVALID',
  legacyCode: null,
  message: _('The field is invalid.'),
  description: _('See https://mzl.la/1ZOhoEN (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_BAD_PERMISSION = {
  code: 'MANIFEST_BAD_PERMISSION',
  legacyCode: null,
  message: _('The permission type is unsupported.'),
  description: _(singleLineString`See https://mzl.la/1R1n1t0
    (MDN Docs) for more information.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_PERMISSIONS = {
  code: 'MANIFEST_PERMISSIONS',
  legacyCode: null,
  message: _('Unknown permission.'),
  description: _('See https://mzl.la/1R1n1t0 (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_VERSION_INVALID = {
  code: 'MANIFEST_VERSION_INVALID',
  legacyCode: null,
  message: _('"manifest_version" in the manifest.json is not a valid value'),
  description: _('See https://mzl.la/20PenXl (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_CSP = {
  // Note: don't change this 'code' without updating addons-server first, as
  // it depends on it to detect add-ons with a custom content security policy.
  code: 'MANIFEST_CSP',
  legacyCode: null,
  message: _('"content_security_policy" is defined in the manifest.json'),
  description: _('A custom content_security_policy needs additional review.'),
  file: MANIFEST_CSP,
};

export const PROP_NAME_INVALID = {
  code: 'PROP_NAME_INVALID',
  legacyCode: null,
  message: _('The "name" property must be a string.'),
  description: _('See http://mzl.la/1STmr48 (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const PROP_VERSION_INVALID = {
  code: 'PROP_VERSION_INVALID',
  legacyCode: null,
  message: _('The "version" property must be a string.'),
  description: _('See http://mzl.la/1kXIADa (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const PROP_VERSION_TOOLKIT_ONLY = {
  code: 'PROP_VERSION_TOOLKIT_ONLY',
  legacyCode: null,
  message: _('The "version" property uses a Firefox-specific format.'),
  description: _('See http://mzl.la/1kXIADa (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_UPDATE_URL = {
  code: 'MANIFEST_UPDATE_URL',
  legacyCode: null,
  message: _('"update_url" is not allowed.'),
  description: _(singleLineString`"applications.gecko.update_url" is not allowed
    for Mozilla-hosted add-ons.`),
  file: MANIFEST_JSON,
};

export const MANIFEST_UNUSED_UPDATE = {
  code: 'MANIFEST_UNUSED_UPDATE',
  legacyCode: null,
  message: _('The "update_url" property is not used by Firefox.'),
  description: _(singleLineString`The "update_url" is not used by Firefox in
    the root of a manifest; your add-on will be updated via the Add-ons
    site and not your "update_url". See: https://mzl.la/25zqk4O`),
  file: MANIFEST_JSON,
};

export function manifestPropMissing(property) {
  return {
    code: `PROP_${property.toUpperCase()}_MISSING`,
    legacyCode: null,
    message: _(`No "${property}" property found in manifest.json`),
    description: _(`"${property}" is required`),
    file: MANIFEST_JSON,
  };
}

export const MANIFEST_ICON_NOT_FOUND = 'MANIFEST_ICON_NOT_FOUND';
export function manifestIconMissing(path) {
  return {
    code: MANIFEST_ICON_NOT_FOUND,
    legacyCode: null,
    message: _(
      'An icon defined in the manifest could not be found in the package.'),
    description: sprintf(
      _('Icon could not be found at "%(path)s".'),
      {path}),
    file: MANIFEST_JSON,
  };
}

export const ICON_NOT_SQUARE = 'ICON_NOT_SQUARE';
export function iconIsNotSquare(path) {
  return {
    code: ICON_NOT_SQUARE,
    legacyCode: null,
    message: _('Icons must be square.'),
    description: sprintf(_('Icon at "%(path)s" must be square.'), {path}),
    file: MANIFEST_JSON,
  };
}

export const ICON_SIZE_INVALID = 'ICON_SIZE_INVALID';
export function iconSizeInvalid({ path, expected, actual }) {
  return {
    code: ICON_SIZE_INVALID,
    legacyCode: null,
    message: _('The size of the icon does not match the manifest.'),
    description: sprintf(
      _('Expected icon at "%(path)s" to be %(expected)d pixels wide but was ' +
        '%(actual)d.'),
      {path, expected, actual}),
    file: MANIFEST_JSON,
  };
}

export const MIN_ICON_SIZE = {
  code: 'MIN_ICON_SIZE',
  legacyCode: null,
  message: _('The icon defined in the manifest is too small.'),
  description: sprintf(
    _('Icons should be at least %(size)sx%(size)s pixels.'),
    {size: constants.MIN_ICON_SIZE}),
  file: MANIFEST_JSON,
};

export const RECOMMENDED_ICON_SIZE = {
  code: 'RECOMMENDED_ICON_SIZE',
  legacyCode: null,
  message: _('Consider adding a larger icon.'),
  description: sprintf(
    _('The smallest recommended size for an icon is %(size)sx%(size)s pixels.'),
    {size: constants.RECOMMENDED_ICON_SIZE}),
  file: MANIFEST_JSON,
};

export const PROP_NAME_MISSING = manifestPropMissing('name');
export const PROP_VERSION_MISSING = manifestPropMissing('version');

export const NO_MESSAGES_FILE = {
  code: 'NO_MESSAGES_FILE',
  legacyCode: null,
  message: _('The "default_locale" is missing localizations.'),
  description: _(singleLineString`The "default_locale" value is specified in
    the manifest, but no matching "messages.json" in the "_locales" directory
    exists. See: https://mzl.la/2hjcaEE`),
  file: MANIFEST_JSON,
};

export const NO_DEFAULT_LOCALE = {
  code: 'NO_DEFAULT_LOCALE',
  legacyCode: null,
  message: _('The "default_locale" is missing but "_locales" exist.'),
  description: _(singleLineString`The "default_locale" value is not specifed in
    the manifest, but a "_locales" directory exists.
    See: https://mzl.la/2hjcaEE`),
  file: MANIFEST_JSON,
};
