import { gettext as _, singleLineString } from 'utils';


export var _tagNotAllowed = (tagName) => {
  return {
    code: `TAG_NOT_ALLOWED_${tagName.toUpperCase()}`,
    message: _(`The <${tagName}> tag is not allowed`),
    description: _(singleLineString`Your RDF file contains the <${tagName}> tag,
      which is not allowed in an Add-on.`),
  };
};

export var _tagObsolete = (tagName) => {
  return {
    code: `TAG_OBSOLETE_${tagName.toUpperCase()}`,
    message: _(`The <${tagName}> tag is obsolete`),
    description: _(singleLineString`Your RDF file contains the <${tagName}> tag,
      which is obsolete.`),
  };
};

export const TAG_NOT_ALLOWED_HIDDEN = _tagNotAllowed('hidden');

export const TAG_OBSOLETE_FILE = _tagObsolete('file');
export const TAG_OBSOLETE_REQUIRES = _tagObsolete('requires');
export const TAG_OBSOLETE_SKIN = _tagObsolete('skin');
