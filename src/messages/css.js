import { gettext as _, singleLineString } from 'utils';


export const MOZ_BINDING_EXT_REFERENCE = {
  code: 'MOZ_BINDING_EXT_REFERENCE',
  message: _('Illegal reference to external scripts'),
  description: _(singleLineString`-moz-binding may not reference external
    scripts in CSS. This is considered to be a security issue. The script
    file must be placed in the /content/ directory of the package.`),
};

export const CSS_SYNTAX_ERROR = {
  code: 'CSS_SYNTAX_ERROR',
  // This will be overriden by the reason passed from the error.
  message: _('A CSS syntax error was encountered'),
  description: _(singleLineString`An error was found in the CSS file being
    processed as a result further processing of that file is not possible`),
};
