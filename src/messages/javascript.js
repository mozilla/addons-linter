import { gettext as _, singleLineString } from 'utils';


export const JS_SYNTAX_ERROR = {
  code: 'JS_SYNTAX_ERROR',
  message: _('JavaScript syntax error'),
  description: _(singleLineString`There is a JavaScript syntax error in your
    code; validation cannot continue on this file.`),
};

export const MOZINDEXEDDB = {
  code: 'MOZINDEXEDDB',
  message: _('mozIndexedDB has been removed; use indexedDB instead'),
  description: _('mozIndexedDB has been removed; use indexedDB instead.'),
};

export const MOZINDEXEDDB_PROPERTY = {
  code: 'MOZINDEXEDDB_PROPERTY',
  message: _('mozIndexedDB used as an object key/property'),
  description: _('mozIndexedDB has been removed; use indexedDB instead.'),
};
