import { oneLine } from 'common-tags';

import { apiToMessage, i18n } from 'utils';

export const JS_SYNTAX_ERROR = {
  code: 'JS_SYNTAX_ERROR',
  message: i18n._('JavaScript syntax error'),
  description: i18n._(oneLine`There is a JavaScript syntax error in your
    code; validation cannot continue on this file.`),
};

export const EVENT_LISTENER_FOURTH = {
  code: 'EVENT_LISTENER_FOURTH',
  message: i18n._('addEventListener` called with truthy fourth argument.'),
  description: i18n._(oneLine`When called with a truthy forth argument,
    listeners can be triggered potentially unsafely by untrusted code. This
    requires careful review.`),
};

export const CONTENT_SCRIPT_NOT_FOUND = {
  code: 'CONTENT_SCRIPT_NOT_FOUND',
  legacyCode: null,
  message: i18n._('Content script file could not be found.'),
  description: i18n._('Content script file could not be found'),
};

export const CONTENT_SCRIPT_EMPTY = {
  code: 'CONTENT_SCRIPT_EMPTY',
  legacyCode: null,
  message: i18n._('Content script file name should not be empty.'),
  description: i18n._('Content script file name should not be empty'),
};

export function _nonLiteralUri(method) {
  return {
    code: `${method}_NONLIT_URI`.toUpperCase(),
    message: i18n._(`'${method}' called with a non-literal uri`),
    description: i18n._(oneLine`Calling '${method}' with variable
      parameters can result in potential security vulnerabilities if the
      variable contains a remote URI. Consider using 'window.open' with
      the 'chrome=no' flag.`),
  };
}

export function _methodPassedRemoteUri(method) {
  return {
    code: `${method}_REMOTE_URI`.toUpperCase(),
    message: i18n._(`'${method}' called with non-local URI`),
    description: i18n._(oneLine`Calling '${method}' with a non-local
      URI will result in the dialog being opened with chrome privileges.`),
  };
}

export const OPENDIALOG_REMOTE_URI = _methodPassedRemoteUri('openDialog');
export const OPENDIALOG_NONLIT_URI = _nonLiteralUri('openDialog');

export const DANGEROUS_EVAL = {
  code: 'DANGEROUS_EVAL',
  message: null,
  description: i18n._(oneLine`Evaluation of strings as code can lead to
    security vulnerabilities and performance issues, even in the
    most innocuous of circumstances. Please avoid using \`eval\` and the
    \`Function\` constructor when at all possible.'`),
};

export const NO_IMPLIED_EVAL = {
  code: 'NO_IMPLIED_EVAL',
  message: null,
  description: i18n._(oneLine`setTimeout, setInterval and execScript
    functions should be called only with function expressions as their
    first argument`),
};

export const UNEXPECTED_GLOGAL_ARG = {
  code: 'UNEXPECTED_GLOGAL_ARG',
  message: i18n._('Unexpected global passed as an argument'),
  description: i18n._(oneLine`Passing a global as an argument
    is not recommended. Please make this a var instead.`),
};

export const NO_DOCUMENT_WRITE = {
  code: 'NO_DOCUMENT_WRITE',
  message: i18n._('Use of document.write strongly discouraged.'),
  description: i18n._(oneLine`document.write will fail in many
    circumstances when used in extensions, and has potentially severe security
    repercussions when used improperly. Therefore, it should not be used.`),
};

export const BANNED_LIBRARY = {
  code: 'BANNED_LIBRARY',
  message: i18n._('Banned 3rd-party JS library'),
  description: i18n._(oneLine`Your add-on uses a JavaScript library we
    consider unsafe. Read more: https://bit.ly/1TRIyZY`),
};

export const UNADVISED_LIBRARY = {
  code: 'UNADVISED_LIBRARY',
  message: i18n._('Unadvised 3rd-party JS library'),
  description: i18n._(oneLine`Your add-on uses a JavaScript library we do
    not recommend. Read more: https://bit.ly/1TRIyZY`),
};

export const KNOWN_LIBRARY = {
  code: 'KNOWN_LIBRARY',
  message: i18n._('Known JS library detected'),
  description: i18n._(oneLine`JavaScript libraries are discouraged for
    simple add-ons, but are generally accepted.`),
};

export const UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT = {
  code: 'UNSAFE_VAR_ASSIGNMENT',
  // Uses original message from eslint
  message: null,
  description: i18n._(oneLine`Due to both security and performance
    concerns, this may not be set using dynamic values which have
    not been adequately sanitized. This can lead to security issues or fairly
    serious performance degradation.`),
};

export const UNSUPPORTED_API = {
  code: 'UNSUPPORTED_API',
  message: null,
  messageFormat: i18n._('{{api}} is not supported'),
  description: i18n._('This API has not been implemented by Firefox.'),
};

function deprecatedAPI(api) {
  return {
    code: apiToMessage(api),
    message: i18n._(`"${api}" is deprecated or unimplemented`),
    description: i18n._(oneLine`This API has been deprecated by Chrome
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
    message: i18n._(`"${api}" can cause issues when loaded temporarily`),
    description: i18n._(oneLine`This API can cause issues when loaded
      temporarily using about:debugging in Firefox unless you specify
      applications > gecko > id in the manifest. Please see:
      https://mzl.la/2hizK4a for more.`),
  };
}

export const STORAGE_LOCAL = temporaryAPI('storage.local');
export const STORAGE_SYNC = temporaryAPI('storage.sync');
export const IDENTITY_GETREDIRECTURL = temporaryAPI('identity.getRedirectURL');

export const ESLINT_OVERWRITE_MESSAGE = {
  'no-eval': DANGEROUS_EVAL,
  'no-implied-eval': NO_IMPLIED_EVAL,
  'no-new-func': DANGEROUS_EVAL,
  'no-unsafe-innerhtml/no-unsafe-innerhtml': UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  'webextension-unsupported-api': UNSUPPORTED_API,
};
