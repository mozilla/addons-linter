import { oneLine } from 'common-tags';

import { gettext as _ } from 'utils';


export const CSS_SYNTAX_ERROR = {
  code: 'CSS_SYNTAX_ERROR',
  // This will be overriden by the reason passed from the error.
  message: _('A CSS syntax error was encountered'),
  description: _(oneLine`An error was found in the CSS file being
    processed as a result further processing of that file is not possible`),
};

export const INVALID_SELECTOR_NESTING = {
  code: 'INVALID_SELECTOR_NESTING',
  message: _('Invalid nesting of selectors found'),
  description: _(oneLine`Selectors should not be nested`),
};
