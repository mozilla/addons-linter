import { gettext as _ } from 'utils';
import { oneLine } from 'common-tags';


export const INLINE_SCRIPT = {
  code: 'INLINE_SCRIPT',
  legacyCode: null,
  message: _('Inline scripts blocked by default'),
  description: _(oneLine`Default CSP rules prevent inline JavaScript
    from running (https://mzl.la/2pn32nd).`),
};


export const REMOTE_SCRIPT = {
  code: 'REMOTE_SCRIPT',
  legacyCode: null,
  message: _('Remote scripts are not allowed as per the Add-on Policies.'),
  description: _(oneLine`Please include all scripts in the add-on.
    For more information, refer to https://mzl.la/2uEOkYp.`),
};
