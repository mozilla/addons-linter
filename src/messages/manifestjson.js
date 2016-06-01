import { gettext as _, singleLineString } from 'utils';
import { MANIFEST_JSON } from 'const';

export const MANIFEST_JSON_INVALID = {
  code: 'MANIFEST_JSON_INVALID',
  legacyCode: null,
  message: _('The manifest.json is not valid.'),
  description: _('See https://mzl.la/1ZOhoEN (MDN Docs) for more information.'),
  file: MANIFEST_JSON,
};

export const MANIFEST_BLOCK_COMMENTS = {
  code: 'MANIFEST_BLOCK_COMMENTS',
  legacyCode: null,
  message: _('The manifest.json contains block comments.'),
  description: _(singleLineString`Only line comments (comments beginning with
    "//") are allowed in manifest.json files. Please remove block comments
    (comments beginning with "/*")`),
  file: MANIFEST_JSON,
};

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

export const MANIFEST_UPDATE_URL = {
  code: 'MANIFEST_UPDATE_URL',
  legacyCode: null,
  message: _('The "update_url" property is not allowed.'),
  description: _('The update_url cannot be defined.'),
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

export const PROP_NAME_MISSING = manifestPropMissing('name');
export const PROP_VERSION_MISSING = manifestPropMissing('version');
