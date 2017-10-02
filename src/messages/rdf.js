import { oneLine } from 'common-tags';

import { gettext as _ } from 'utils';
import { INSTALL_RDF } from 'const';


export const _tagNotAllowed = (tagName) => {
  return {
    code: `TAG_NOT_ALLOWED_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    message: _(`<${tagName}> tag is not allowed`),
    description: _(oneLine`Your RDF file contains the <${tagName}> tag,
      which is not allowed in an Add-on.`),
  };
};

export const _tagNotAllowedIfTag = (tagName, otherTag) => {
  return {
    code: `TAG_NOT_ALLOWED_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    message: _(`<${tagName}> cannot be used with <${otherTag}>`),
    description: _(oneLine`Your RDF file contains the <${tagName}> tag,
      which cannot be used with a <${otherTag}> tag.`),
  };
};

export const _tagObsolete = (tagName) => {
  return {
    code: `TAG_OBSOLETE_${tagName.toUpperCase()}`,
    // Non-unique err_id so setting to null
    // ('testcases_installrdf', '_test_rdf', 'shouldnt_exist')
    message: _(`<${tagName}> tag is obsolete`),
    description: _(oneLine`Your RDF file contains the <${tagName}> tag,
      which is obsolete.`),
  };
};

export const RDF_GUID_TOO_LONG = {
  code: 'RDF_GUID_TOO_LONG',
  message: _('GUID is too long (over 255 chars)'),
  description: _(oneLine`A GUID must be 255 characters or less.
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
  message: _('Invalid <em:type> value'),
  description: _(oneLine`The only valid values for <em:type>
    are 2, 4, 8, and 32. Any other values are either invalid or
    deprecated.`),
  file: INSTALL_RDF,
};

export const RDF_TYPE_MISSING = {
  code: 'RDF_TYPE_MISSING',
  message: _('No <em:type> element found in install.rdf'),
  description: _(oneLine`It isn't always required, but it is
    the most reliable method for determining add-on type.`),
  file: INSTALL_RDF,
};

export function rdfMultipleTags(tag) {
  return {
    code: `RDF_MULTIPLE_${tag.toUpperCase()}_TAGS`,
    message: _(`Multiple <${tag}> elements found`),
    description: _(oneLine`There should be only one tag <${tag}>`),
    file: INSTALL_RDF,
  };
}

export const RDF_TAG_NOT_FOUND = {
  code: 'RDF_TAG_NOT_FOUND',
  message: _(`RDF Node is not defined`),
  description: _(oneLine`RDF tag should be defined`),
  file: INSTALL_RDF,
};

export const RDF_MANY_CHILDREN = {
  code: 'RDF_MANY_CHILDREN',
  message: _(`RDF node should only have a single descendant <Description>`),
  description: _(oneLine`RDF tag should have only one child`),
  file: INSTALL_RDF,
};


export function rdfTopLevelTagMissing(tagName) {
  return {
    code: `RDF_${tagName.toUpperCase()}_MISSING`,
    message: _(`No <em:${tagName}> element at the top level of install.rdf`),
    description: _(`<em:${tagName}> at the top level is required`),
    file: INSTALL_RDF,
  };
}

export const RDF_NAME_MISSING = rdfTopLevelTagMissing('name');
export const RDF_VERSION_MISSING = rdfTopLevelTagMissing('version');
export const RDF_ID_MISSING = rdfTopLevelTagMissing('id');

export const RDF_MULTIPLE_NAME_TAGS = rdfMultipleTags('name');
export const RDF_MULTIPLE_VERSION_TAGS = rdfMultipleTags('version');
export const RDF_MULTIPLE_ID_TAGS = rdfMultipleTags('id');
export const RDF_MULTIPLE_TYPE_TAGS = rdfMultipleTags('type');
