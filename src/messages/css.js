import { i18n } from 'utils';

export const CSS_SYNTAX_ERROR = {
  code: 'CSS_SYNTAX_ERROR',
  // This will be overriden by the reason passed from the error.
  message: i18n._('A CSS syntax error was encountered'),
  description: i18n._(`An error was found in the CSS file being processed. As a
    result, further processing of that file is not possible`),
};

export const INVALID_SELECTOR_NESTING = {
  code: 'INVALID_SELECTOR_NESTING',
  message: i18n._('Invalid nesting of selectors found'),
  description: i18n._(`Selector nesting is supported from Firefox version 117.0
  and above`),
};
