import { gettext as _, singleLineString } from 'utils';


export var _tagNotAllowed = (tagName) => {
  return {
    code: `TAG_NOT_ALLOWED_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    legacyCode: null,
    message: _(`<${tagName}> tag is not allowed`),
    description: _(singleLineString`Your RDF file contains the <${tagName}> tag,
      which is not allowed in an Add-on.`),
  };
};

export var _tagNotAllowedIfTag = (tagName, otherTag) => {
  return {
    code: `TAG_NOT_ALLOWED_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    legacyCode: null,
    message: _(`<${tagName}> cannot be used with <${otherTag}>`),
    description: _(singleLineString`Your RDF file contains the <${tagName}> tag,
      which cannot be used with a <${otherTag}> tag.`),
  };
};

export var _tagObsolete = (tagName) => {
  return {
    code: `TAG_OBSOLETE_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    legacyCode: null,
    message: _(`<${tagName}> tag is obsolete`),
    description: _(singleLineString`Your RDF file contains the <${tagName}> tag,
      which is obsolete.`),
  };
};

export const GUID_TOO_LONG = {
  code: 'GUID_TOO_LONG',
  legacyCode: null,
  message: _('GUID is too long (over 255 chars)'),
  description: _(singleLineString`A GUID must be 255 characters or less.
    Please use a shorter GUID.`),
};

export const TAG_NOT_ALLOWED_HIDDEN = _tagNotAllowed('hidden');
export const TAG_NOT_ALLOWED_UPDATEKEY = _tagNotAllowedIfTag('updateKey',
                                                             'listed');
export const TAG_NOT_ALLOWED_UPDATEURL = _tagNotAllowedIfTag('updateURL',
                                                             'listed');

export const TAG_OBSOLETE_FILE = _tagObsolete('file');
export const TAG_OBSOLETE_REQUIRES = _tagObsolete('requires');
export const TAG_OBSOLETE_SKIN = _tagObsolete('skin');
