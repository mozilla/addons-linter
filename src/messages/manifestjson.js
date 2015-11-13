import { gettext as _ } from 'utils';

export const MANIFEST_VERSION_INVALID = {
  code: 'MANIFEST_VERSION_INVALID',
  legacyCode: null,
  message: _('"manifest_version" in the manifest.json is not a valid value'),
  description: _('See http://mzl.la/20PenXl (MDN Docs) for more information.'),
};

export const MANIFEST_NAME_INVALID = {
  code: 'MANIFEST_NAME_INVALID',
  legacyCode: null,
  message: _('"name" in the manifest.json is not a valid value'),
  description: _('See http://mzl.la/1STmr48 (MDN Docs) for more information.'),
};

