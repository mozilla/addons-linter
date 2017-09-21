import { oneLine } from 'common-tags';

import { apiToMessage, gettext as _ } from 'utils';

export const JS_SYNTAX_ERROR = {
  code: 'JS_SYNTAX_ERROR',
  legacyCode: [
    'testcases_scripting',
    'test_js_file',
    'syntax_error',
  ],
  message: _('JavaScript syntax error'),
  description: _(oneLine`There is a JavaScript syntax error in your
    code; validation cannot continue on this file.`),
};

export const EVENT_LISTENER_FOURTH = {
  code: 'EVENT_LISTENER_FOURTH',
  message: _('addEventListener` called with truthy fourth argument.'),
  description: _(oneLine`When called with a truthy forth argument,
    listeners can be triggered potentially unsafely by untrusted code. This
    requires careful review.`),
  legacyCode: ['js', 'instanceactions', 'addEventListener_fourth'],
};

export const MOZINDEXEDDB = {
  code: 'MOZINDEXEDDB',
  // Original code appeared to have a non-unique err_id which is no
  // use for comparsions. ('testcases_regex', 'generic', '_generated')
  legacyCode: null,
  message: _('mozIndexedDB has been removed; use indexedDB instead'),
  description: _('mozIndexedDB has been removed; use indexedDB instead.'),
};

export const MOZINDEXEDDB_PROPERTY = {
  code: 'MOZINDEXEDDB_PROPERTY',
  // Original code appeared to have a non-unique err_id which is no
  // use for comparsions. ('testcases_regex', 'generic', '_generated')
  legacyCode: null,
  message: _('mozIndexedDB used as an object key/property'),
  description: _('mozIndexedDB has been removed; use indexedDB instead.'),
};

export function _nonLiteralUri(method) {
  return {
    code: `${method}_NONLIT_URI`.toUpperCase(),
    legacyCode: [
      'js',
      'instanceactions',
      `${method}_nonliteral`,
    ],
    message: _(`'${method}' called with a non-literal uri`),
    description: _(oneLine`Calling '${method}' with variable
      parameters can result in potential security vulnerabilities if the
      variable contains a remote URI. Consider using 'window.open' with
      the 'chrome=no' flag.`),
  };
}

export function _methodPassedRemoteUri(method) {
  return {
    code: `${method}_REMOTE_URI`.toUpperCase(),
    legacyCode: [
      'js',
      'instanceactions',
      `${method}_remote_uri`,
    ],
    message: _(`'${method}' called with non-local URI`),
    description: _(oneLine`Calling '${method}' with a non-local
      URI will result in the dialog being opened with chrome privileges.`),
  };
}

export const OPENDIALOG_REMOTE_URI = _methodPassedRemoteUri('openDialog');
export const OPENDIALOG_NONLIT_URI = _nonLiteralUri('openDialog');

export const DANGEROUS_EVAL = {
  code: 'DANGEROUS_EVAL',
  message: null,
  description: _(oneLine`Evaluation of strings as code can lead to
    security vulnerabilities and performance issues, even in the
    most innocuous of circumstances. Please avoid using \`eval\` and the
    \`Function\` constructor when at all possible.'`),
  legacyCode: null,
};

export const NO_IMPLIED_EVAL = {
  code: 'NO_IMPLIED_EVAL',
  message: null,
  description: _(oneLine`setTimeout, setInterval and execScript
    functions should be called only with function expressions as their
    first argument`),
  legacyCode: null,
};

export const UNEXPECTED_GLOGAL_ARG = {
  code: 'UNEXPECTED_GLOGAL_ARG',
  message: _('Unexpected global passed as an argument'),
  description: _(oneLine`Passing a global as an argument
    is not recommended. Please make this a var instead.`),
  legacyCode: null,
};

export const NO_DOCUMENT_WRITE = {
  code: 'NO_DOCUMENT_WRITE',
  message: _('Use of document.write strongly discouraged.'),
  description: _(oneLine`document.write will fail in many
    circumstances when used in extensions, and has potentially severe security
    repercussions when used improperly. Therefore, it should not be used.`),
  legacyCode: [
    'js', 'document.write', 'evil',
  ],
};

export const BANNED_LIBRARY = {
  code: 'BANNED_LIBRARY',
  message: _('Banned 3rd-party JS library'),
  description: _(oneLine`Your add-on uses a JavaScript library we
    consider unsafe. Read more: https://bit.ly/1TRIyZY`),
  legacyCode: null,
};

export const UNADVISED_LIBRARY = {
  code: 'UNADVISED_LIBRARY',
  message: _('Unadvised 3rd-party JS library'),
  description: _(oneLine`Your add-on uses a JavaScript library we do
    not recommend. Read more: https://bit.ly/1TRIyZY`),
  legacyCode: null,
};

export const KNOWN_LIBRARY = {
  code: 'KNOWN_LIBRARY',
  message: _('Known JS library detected'),
  description: _(oneLine`JavaScript libraries are discouraged for
    simple add-ons, but are generally accepted.`),
  legacyCode: [
    'testcases_content', 'test_packed_packages', 'blacklisted_js_library',
  ],
};

export const UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT = {
  code: 'UNSAFE_VAR_ASSIGNMENT',
  // Uses original message from eslint
  message: null,
  legacyCode: null,
  description: _(oneLine`Due to both security and performance
    concerns, this may not be set using dynamic values which have
    not been adequately sanitized. This can lead to security issues or fairly
    serious performance degradation.`),
};

export const UNSUPPORTED_API = {
  code: 'UNSUPPORTED_API',
  message: null,
  messageFormat: _('{{api}} is not supported'),
  description: _('This API has not been implemented by Firefox.'),
  legacyCode: null,
};

function deprecatedAPI(api) {
  return {
    code: apiToMessage(api),
    legacyCode: [
      'js',
      'deprecated',
      api,
    ],
    message: _(`"${api}" is deprecated or unimplemented`),
    description: _(oneLine`This API has been deprecated by Chrome
      and has not been implemented by Firefox.`),
  };
}

export const APP_GETDETAILS = deprecatedAPI('app.getDetails');
export const EXT_ONREQUEST = deprecatedAPI('extension.onRequest');
export const EXT_ONREQUESTEXTERNAL = deprecatedAPI(
  'extension.onRequestExternal');
export const EXT_SENDREQUEST = deprecatedAPI('extension.sendRequest');
export const TABS_GETALLINWINDOW = deprecatedAPI('tabs.getAllInWindow');
export const TABS_GETSELECTED = deprecatedAPI('tabs.getSelected');
export const TABS_ONACTIVECHANGED = deprecatedAPI('tabs.onActiveChanged');
export const TABS_ONSELECTIONCHANGED = deprecatedAPI(
  'tabs.onSelectionChanged');
export const TABS_SENDREQUEST = deprecatedAPI('tabs.sendRequest');

function temporaryAPI(api) {
  return {
    code: apiToMessage(api),
    legacyCode: [
      'js',
      'temporary',
      api,
    ],
    message: _(`"${api}" can cause issues when loaded temporarily`),
    description: _(oneLine`This API can cause issues when loaded
      temporarily using about:debugging in Firefox unless you specify
      applications > gecko > id in the manifest. Please see:
      https://mzl.la/2hizK4a for more.`),
  };
}

export const STORAGE_LOCAL = temporaryAPI('storage.local');
export const STORAGE_SYNC = temporaryAPI('storage.sync');
export const IDENTITY_GETREDIRECTURL = temporaryAPI('identity.getRedirectURL');
