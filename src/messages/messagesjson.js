import { oneLine } from 'common-tags';

import { gettext as _ } from 'utils';

export const NO_MESSAGE = {
  code: 'NO_MESSAGE',
  message: _('Translation string is missing the message property'),
  description: _(oneLine`No "message" message property is set for a string
    (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference#message).`),
};

export const PREDEFINED_MESSAGE_NAME = {
  code: 'PREDEFINED_MESSAGE_NAME',
  message: _('String name is reserved for a predefined message'),
  description: _('Special strings get translated to constants (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Internationalization#Predefined_messages).'),
};

export const INVALID_MESSAGE_NAME = {
  code: 'INVALID_MESSAGE_NAME',
  message: 'String name contains invalid characters',
  description: _('String name contains characters that are not allowed (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference#name).'),
};

export const MISSING_PLACEHOLDER = {
  code: 'MISSING_PLACEHOLDER',
  message: _('Placeholder for message is missing'),
  description: _(oneLine`A placeholder used in the message is not defined.`),
};

export const INVALID_PLACEHOLDER_NAME = {
  code: 'INVALID_PLACEHOLDER_NAME',
  message: _('Placeholder name contains invalid characters'),
  description: _('Placeholder name contains characters that are not allowed (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference#placeholder_name).'),
};

export const NO_PLACEHOLDER_CONTENT = {
  code: 'NO_PLACEHOLDER_CONTENT',
  message: _('Placeholder is missing the content property'),
  description: _('Placeholders need a content property defining the replacement of it (https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference#placeholder_content)'),
};
