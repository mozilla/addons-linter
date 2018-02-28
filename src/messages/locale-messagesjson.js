import { oneLine } from 'common-tags';

import { i18n } from 'utils';

export const NO_MESSAGE = {
  code: 'NO_MESSAGE',
  message: i18n._('Translation string is missing the message property'),
  description: i18n._('No "message" message property is set for a string (https://mzl.la/2DSBTjA).'),
};

export const PREDEFINED_MESSAGE_NAME = {
  code: 'PREDEFINED_MESSAGE_NAME',
  message: i18n._('String name is reserved for a predefined message'),
  description: i18n._(oneLine`String names starting with @@ get translated to built-in
    constants (https://mzl.la/2BL9ZjE).`),
};

export const INVALID_MESSAGE_NAME = {
  code: 'INVALID_MESSAGE_NAME',
  message: 'String name contains invalid characters',
  description: i18n._(oneLine`String name should only contain alpha-numeric
    characters, _ and @ (https://mzl.la/2Eztyi5).`),
};

export const MISSING_PLACEHOLDER = {
  code: 'MISSING_PLACEHOLDER',
  message: i18n._('Placeholder for message is missing'),
  description: i18n._('A placeholder used in the message is not defined.'),
};

export const INVALID_PLACEHOLDER_NAME = {
  code: 'INVALID_PLACEHOLDER_NAME',
  message: i18n._('Placeholder name contains invalid characters'),
  description: i18n._(oneLine`Placeholder name should only contain alpha-numeric
    characters, _ and @ (https://mzl.la/2ExbYez).`),
};

export const NO_PLACEHOLDER_CONTENT = {
  code: 'NO_PLACEHOLDER_CONTENT',
  message: i18n._('Placeholder is missing the content property'),
  description: i18n._(oneLine`A placeholder needs a content property defining the
    replacement of it (https://mzl.la/2DT1MQd)`),
};
