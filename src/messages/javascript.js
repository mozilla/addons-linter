import { apiToMessage, i18n } from 'utils';

export const JS_SYNTAX_ERROR = {
  code: 'JS_SYNTAX_ERROR',
  message: i18n._('JavaScript syntax error'),
  description: i18n._(`There is a JavaScript syntax error in your
    code, which might be related to some experimental JavaScript features that
    aren't an official part of the language specification and therefore not
    supported yet. The validation cannot continue on this file.`),
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
    message: i18n.sprintf(
      i18n._(`"%(method)s" called with a non-literal uri`),
      { method }
    ),
    description: i18n.sprintf(
      i18n._(`Calling "%(method)s" with variable parameters can result in
        potential security vulnerabilities if the variable contains a remote
        URI. Consider using 'window.open' with the 'chrome=no' flag.`),
      { method }
    ),
  };
}

export function _methodPassedRemoteUri(method) {
  return {
    code: `${method}_REMOTE_URI`.toUpperCase(),
    message: i18n.sprintf(i18n._(`"%(method)s" called with non-local URI`), {
      method,
    }),
    description: i18n.sprintf(
      i18n._(`Calling "%(method)s" with a non-local URI will result in the
        dialog being opened with chrome privileges.`),
      { method }
    ),
  };
}

export const OPENDIALOG_REMOTE_URI = _methodPassedRemoteUri('openDialog');
export const OPENDIALOG_NONLIT_URI = _nonLiteralUri('openDialog');

export const DANGEROUS_EVAL = {
  code: 'DANGEROUS_EVAL',
  message: null,
  description: i18n._(`Evaluation of strings as code can lead to
    security vulnerabilities and performance issues, even in the
    most innocuous of circumstances. Please avoid using \`eval\` and the
    \`Function\` constructor when at all possible.'`),
};

export const NO_IMPLIED_EVAL = {
  code: 'NO_IMPLIED_EVAL',
  message: null,
  description: i18n._(`setTimeout, setInterval and execScript
    functions should be called only with function expressions as their
    first argument`),
};

export const UNEXPECTED_GLOGAL_ARG = {
  code: 'UNEXPECTED_GLOGAL_ARG',
  message: i18n._('Unexpected global passed as an argument'),
  description: i18n._(`Passing a global as an argument
    is not recommended. Please make this a var instead.`),
};

export const NO_DOCUMENT_WRITE = {
  code: 'NO_DOCUMENT_WRITE',
  message: i18n._('Use of document.write strongly discouraged.'),
  description: i18n._(`document.write will fail in many
    circumstances when used in extensions, and has potentially severe security
    repercussions when used improperly. Therefore, it should not be used.`),
};

export const BANNED_LIBRARY = {
  code: 'BANNED_LIBRARY',
  message: i18n._('Banned 3rd-party JS library'),
  description: i18n._(`Your add-on uses a JavaScript library we
    consider unsafe. Read more: https://bit.ly/1TRIyZY`),
};

export const UNADVISED_LIBRARY = {
  code: 'UNADVISED_LIBRARY',
  message: i18n._('Unadvised 3rd-party JS library'),
  description: i18n._(`Your add-on uses a JavaScript library we do
    not recommend. Read more: https://bit.ly/1TRIyZY`),
};

export const KNOWN_LIBRARY = {
  code: 'KNOWN_LIBRARY',
  message: i18n._('Known JS library detected'),
  description: i18n._(`JavaScript libraries are discouraged for
    simple add-ons, but are generally accepted.`),
};

export const UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT = {
  code: 'UNSAFE_VAR_ASSIGNMENT',
  // Uses original message from eslint
  message: null,
  description: i18n._(`Due to both security and performance
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

export const REMOVED_MV2_API = {
  code: 'UNSUPPORTED_API',
  message: null,
  messageFormat: i18n._(
    '"{{api}}" has been removed in Manifest Version 3 (`manifest_version` property)'
  ),
  description: null,
};

export const DEPRECATED_API = {
  code: 'DEPRECATED_API',
  message: null,
  messageFormat: i18n._('{{api}} is deprecated'),
  description: i18n._('This API has been deprecated by Firefox.'),
};

export const DEPRECATED_CHROME_API = {
  // We are re-using the same code here for consistency and for technical
  // reasons. We aren't really able to issue different codes from the same
  // rule, so until we have to, we're going to re-use the `DEPRECATED_API`
  // code.
  // Because of that implementation detail ``description`` isn't being usable
  // too.
  code: 'DEPRECATED_API',
  message: null,
  messageFormat: i18n._('"{{api}}" is deprecated or unimplemented'),
  description: null,
};

function temporaryAPI(api) {
  return {
    code: apiToMessage(api),
    message: i18n.sprintf(
      i18n._(`"%(api)s" can cause issues when loaded temporarily`),
      { api }
    ),
    description: i18n._(`This API can cause issues when loaded
      temporarily using about:debugging in Firefox unless you specify
      "browser_specific_settings.gecko.id" in the manifest.
      Please see: https://mzl.la/2hizK4a for more.`),
  };
}

export const STORAGE_SYNC = temporaryAPI('storage.sync');
export const IDENTITY_GETREDIRECTURL = temporaryAPI('identity.getRedirectURL');
export const STORAGE_MANAGED = temporaryAPI('storage.managed');
export const RUNTIME_ONMESSAGEEXTERNAL = temporaryAPI(
  'runtime.onMessageExternal'
);
export const RUNTIME_ONCONNECTEXTERNAL = temporaryAPI(
  'runtime.onConnectExternal'
);

export const INCOMPATIBLE_API = {
  code: 'INCOMPATIBLE_API',
  message: null,
  messageFormat: i18n._(
    '{{api}} is not supported in Firefox version {{minVersion}}'
  ),
  description: i18n._(
    'This API is not implemented by the given minimum Firefox version'
  ),
};

export const ANDROID_INCOMPATIBLE_API = {
  code: 'ANDROID_INCOMPATIBLE_API',
  message: null,
  messageFormat: i18n._(
    '{{api}} is not supported in Firefox for Android version {{minVersion}}'
  ),
  description: i18n._(
    'This API is not implemented by the given minimum Firefox for Android version'
  ),
};

export const ESLINT_OVERWRITE_MESSAGE = {
  'no-eval': DANGEROUS_EVAL,
  'no-implied-eval': NO_IMPLIED_EVAL,
  'no-new-func': DANGEROUS_EVAL,
  'no-unsanitized/property': UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  'no-unsanitized/method': UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  'webextension-unsupported-api': UNSUPPORTED_API,
  'webextension-deprecated-api': DEPRECATED_API,
  'webextension-api-compat': INCOMPATIBLE_API,
  'webextension-api-compat-android': ANDROID_INCOMPATIBLE_API,
};
