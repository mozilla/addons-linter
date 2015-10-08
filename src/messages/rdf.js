import { gettext as _, singleLineString } from 'utils';


export const TAG_NOT_ALLOWED_HIDDEN = {
  code: 'TAG_NOT_ALLOWED_HIDDEN',
  message: _('The <hidden> tag is not allowed'),
  description: _(singleLineString`Your RDF file contains the <hidden> tag,
    which is not allowed in an Add-on.`),
};

// NOTE: I didn't want to change the commonality of messages without discussion,
// but this is ripe for a refactor. Are we okay with dynamic messages eg:
//
// `export TAG_OBSOLETE((tag) => {
//   return {
//     code: 'TAG_OBSOLETE_${tag.toUpperCase()}',
//     message: _('The <{tag}> tag is obsolete'),
//     description: _(singleLineString`Your RDF file contains the <{tag}> tag,
//                                     which is obsolete.`),
//   };
// });`
export const TAG_OBSOLETE_FILE = {
  code: 'TAG_OBSOLETE_FILE',
  message: _('The <file> tag is obsolete'),
  description: _(singleLineString`Your RDF file contains the <file> tag,
    which is obsolete.`),
};

export const TAG_OBSOLETE_REQUIRES = {
  code: 'TAG_OBSOLETE_REQUIRES',
  message: _('The <requires> tag is obsolete'),
  description: _(singleLineString`Your RDF file contains the <requires> tag,
    which is obsolete.`),
};

export const TAG_OBSOLETE_SKIN = {
  code: 'TAG_OBSOLETE_SKIN',
  message: _('The <skin> tag is obsolete'),
  description: _(singleLineString`Your RDF file contains the <skin> tag,
    which is obsolete.`),
};
