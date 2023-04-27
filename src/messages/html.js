import { i18n } from 'utils';

export const INLINE_SCRIPT = {
  code: 'INLINE_SCRIPT',
  message: i18n._('Inline scripts blocked by default'),
  description: i18n._(`Default CSP rules prevent inline JavaScript
    from running (https://mzl.la/2pn32nd).`),
};

export const REMOTE_SCRIPT = {
  code: 'REMOTE_SCRIPT',
  message: i18n._('Remote scripts are not allowed as per the Add-on Policies.'),
  description: i18n._(`Please include all scripts in the add-on.
    For more information, refer to https://mzl.la/2uEOkYp.`),
};
