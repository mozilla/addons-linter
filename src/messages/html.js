import { gettext as _, singleLineString } from 'utils';

export const INLINE_SCRIPT = {
  code: 'INLINE_SCRIPT',
  legacyCode: null,
  message: _('Inline scripts blocked by default'),
  description: _(singleLineString`Default CSP rules prevent inline JavaScript
    from running (https://mzl.la/2pn32nd).`),
};


export const REMOTE_SCRIPT = {
  code: 'REMOTE_SCRIPT',
  legacyCode: null,
  message: _('Remote scripts are blocked by default'),
  description: _(singleLineString`Default CSP rules prevent remote JavaScript
    from being loaded (https://mzl.la/2pn32nd).`),
};
