import { gettext as _, singleLineString } from 'utils';


export const CSS_SYNTAX_ERROR = {
  code: 'CSS_SYNTAX_ERROR',
  // This will be overriden by the reason passed from the error.
  legacyCode: null,
  message: _('A CSS syntax error was encountered'),
  description: _(singleLineString`An error was found in the CSS file being
    processed as a result further processing of that file is not possible`),
};

export const INVALID_SELECTOR_NESTING = {
  code: 'INVALID_SELECTOR_NESTING',
  legacyCode: null,
  message: _('Invalid nesting of selectors found'),
  description: _(singleLineString`Selectors should not be nested`),
};
