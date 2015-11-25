import { gettext as _, singleLineString } from 'utils';
import { INSTALL_RDF } from 'const';


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

export const RDF_GUID_TOO_LONG = {
  code: 'RDF_GUID_TOO_LONG',
  legacyCode: null,
  message: _('GUID is too long (over 255 chars)'),
  description: _(singleLineString`A GUID must be 255 characters or less.
    Please use a shorter GUID.`),
  file: INSTALL_RDF,
};

export const TAG_NOT_ALLOWED_HIDDEN = _tagNotAllowed('hidden');
export const TAG_NOT_ALLOWED_UPDATEKEY = _tagNotAllowedIfTag('updateKey',
                                                             'listed');
export const TAG_NOT_ALLOWED_UPDATEURL = _tagNotAllowedIfTag('updateURL',
                                                             'listed');
export const TAG_OBSOLETE_FILE = _tagObsolete('file');
export const TAG_OBSOLETE_REQUIRES = _tagObsolete('requires');
export const TAG_OBSOLETE_SKIN = _tagObsolete('skin');

export const RDF_TYPE_INVALID = {
  code: 'RDF_TYPE_INVALID',
  legacyCode: [
    'typedetection',
    'detect_type',
    'invalid_em_type',
  ],
  message: _('Invalid <em:type> value'),
  description: _(singleLineString`The only valid values for <em:type>
    are 2, 4, 8, and 32. Any other values are either invalid or
    deprecated.`),
  file: INSTALL_RDF,
};

export const RDF_TYPE_MISSING = {
  code: 'RDF_TYPE_MISSING',
  legacyCode: [
    'typedetection',
    'detect_type',
    'no_em:type',
  ],
  message: _('No <em:type> element found in install.rdf'),
  description: _(singleLineString`It isn't always required, but it is
    the most reliable method for determining add-on type.`),
  file: INSTALL_RDF,
};

export function rdfTopLevelTagMissing(tagName) {
  return {
    code: `RDF_${tagName.toUpperCase()}_MISSING`,
    legacyCode: null,
    message: _(`No <em:${tagName}> element at the top level of install.rdf`),
    description: _(`<em:${tagName}> at the top level is required`),
    file: INSTALL_RDF,
  };
}

export const RDF_NAME_MISSING = rdfTopLevelTagMissing('name');
export const RDF_VERSION_MISSING = rdfTopLevelTagMissing('version');
export const RDF_ID_MISSING = rdfTopLevelTagMissing('id');
