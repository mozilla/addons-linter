import { gettext as _, singleLineString } from 'utils';


export var _tagRequiresAttribute = (tagName, attribute) => {
  return {
    code: `${tagName}_REQUIRES_${attribute}`.toUpperCase(),
    legacyCode: [
      'markup',
      'starttag',
      `${tagName}_${attribute}`,
    ],
    message: _(`<${tagName}> missing "${attribute}"`),
    description: _(singleLineString`The <${tagName}> tag requires the
      ${attribute}, but it's missing.`),
  };
};

export const PREFWINDOW_REQUIRES_ID = _tagRequiresAttribute('prefwindow', 'id');
