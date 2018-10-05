# Linter Rules

This document is automatically published on [github pages](http://mozilla.github.io/addons-linter/). To update it edit `docs/rules.md` in the [github repo](https://github.com/mozilla/addons-linter).

Rules are sorted by severity.

## JavaScript

| Message code              | Severity | Description                                                      |
| ------------------------- | -------- | ---------------------------------------------------------------- |
| `KNOWN_LIBRARY`           | notice   | This is version of a JS library is known and generally accepted. |
| `OPENDIALOG_NONLIT_URI`   | notice   | openDialog called with non-literal parameter                     |
| `EVENT_LISTENER_FOURTH`   | notice   | `addEventListener` called with truthy fourth argument            |
| `UNEXPECTED_GLOGAL_ARG`   | warning  | Unexpected global passed as an argument                          |
| `NO_IMPLIED_EVAL`         | warning  | disallow the use of `eval()`-like methods                        |
| `OPENDIALOG_REMOTE_URI`   | warning  | openDialog called with non-local URI                             |
| `NO_DOCUMENT_WRITE`       | warning  | Use of `document.write` strongly discouraged.                    |
| `JS_SYNTAX_ERROR`         | warning  | JavaScript compile-time error                                    |
| `UNADVISED_LIBRARY`       | warning  | This version of a JS library is not recommended.                 |
| `TABS_GETSELECTED`        | warning  | Deprecated API tabs.getSelected                                  |
| `TABS_SENDREQUEST`        | warning  | Deprecated API tabs.sendRequest                                  |
| `TABS_GETALLINWINDOW`     | warning  | Deprecated API tabs.getAllInWindow                               |
| `TABS_ONSELECTIONCHANGED` | warning  | Deprecated API tabs.onSelectionChanged                           |
| `TABS_ONACTIVECHANGED`    | warning  | Deprecated API tabs.onActiveChanged                              |
| `EXT_SENDREQUEST`         | warning  | Deprecated API extension.sendRequest                             |
| `EXT_ONREQUESTEXTERNAL`   | warning  | Deprecated API extension.onRequestExternal                       |
| `EXT_ONREQUEST`           | warning  | Deprecated API extension.onRequest                               |
| `APP_GETDETAILS`          | warning  | Deprecated API app.getDetails                                    |
| `STORAGE_LOCAL`           | warning  | Temporary IDs can cause issues with storage.local                |
| `STORAGE_SYNC`            | warning  | Temporary IDs can cause issues with storage.sync                 |
| `IDENTITY_GETREDIRECTURL` | warning  | Temporary IDs can cause issues with identity.getRedirectURL      |
| `BANNED_LIBRARY`          | error    | This version of a JS library is banned for security reasons.     |

## Markup

### CSS

| Message code               | Severity | Description                        |
| -------------------------- | -------- | ---------------------------------- |
| `CSS_SYNTAX_ERROR`         | error    | A CSS syntax error was detected    |
| `INVALID_SELECTOR_NESTING` | error    | CSS selectors should not be nested |

### HTML

| Message code    | Severity | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| `INLINE_SCRIPT` | warning  | Inline script is disallowed by CSP                    |
| `REMOTE_SCRIPT` | warning  | Remote scripts are not allowed as per Add-on Policies |

## Content

| Message code   | Severity | Description            |
| -------------- | -------- | ---------------------- |
| `HIDDEN_FILE`  | warning  | Hidden file flagged    |
| `FLAGGED_FILE` | warning  | Flagged filename found |

## Package layout

| Message code               | Severity | Description                                        |
| -------------------------- | -------- | -------------------------------------------------- |
| `MOZILLA_COND_OF_USE`      | notice   | Mozilla conditions of use violation                |
| `FLAGGED_FILE_TYPE`        | notice   | (Binary) Flagged file type found                   |
| `FLAGGED_FILE_EXTENSION`   | warning  | Flagged file extensions found                      |
| `DUPLICATE_XPI_ENTRY`      | warning  | Package contains duplicate entries                 |
| `ALREADY_SIGNED`           | warning  | Already signed                                     |
| `COINMINER_USAGE_DETECTED` | warning  | Firefox add-ons are not allowed to run coin miners |
| `BAD_ZIPFILE`              | error    | Bad zip file                                       |
| `FILE_TOO_LARGE`           | error    | File is too large to parse                         |

## Type detection

| Message code            | Severity | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| `TYPE_NO_MANIFEST_JSON` | notice   | Add-on missing manifest_json for type detection |

## Language packs

| Message code   | Severity | Description                  |
| -------------- | -------- | ---------------------------- |
| FLUENT_INVALID | warning  | Invalid fluent template file |

## Web Extensions / manifest.json

| Message code                | Severity | Description                                                          |
| --------------------------- | -------- | -------------------------------------------------------------------- |
| `MANIFEST_UNUSED_UPDATE`    | notice   | update_url ignored in manifest.json                                  |
| `PROP_VERSION_TOOLKIT_ONLY` | notice   | version is in the toolkit format in manifest.json                    |
| `CORRUPT_ICON_FILE`         | warning  | Icons must not be corrupt                                            |
| `MANIFEST_CSP`              | warning  | content_security_policy in manifest.json means more review           |
| `MANIFEST_CSP_UNSAFE_EVAL`  | warning  | usage of 'unsafe-eval' is strongly discouraged                       |
| `MANIFEST_PERMISSIONS`      | warning  | Unknown permission                                                   |
| `NO_MESSAGES_FILE`          | warning  | When default_locale is specified a matching messages.json must exist |
| `NO_DEFAULT_LOCALE`         | warning  | When \_locales directory exists, default_locale must exist           |
| `UNSAFE_VAR_ASSIGNMENT`     | warning  | Assignment using dynamic, unsanitized values                         |
| `UNSUPPORTED_API`           | warning  | Unsupported or unknown browser API                                   |
| `DANGEROUS_EVAL`            | warning  | `eval` and the `Function` constructor are discouraged                |
| `STRICT_MAX_VERSION`        | warning  | strict_max_version not required                                      |
| `PREDEFINED_MESSAGE_NAME`   | warning  | String name is reserved for a predefined                             |
| `MISSING_PLACEHOLDER`       | warning  | Placeholder for message is not                                       |
| `WRONG_ICON_EXTENSION`      | error    | Icons must have valid extension                                      |
| `MANIFEST_UPDATE_URL`       | error    | update_url not allowed in manifest.json                              |
| `MANIFEST_FIELD_REQUIRED`   | error    | A required field is missing                                          |
| `MANIFEST_FIELD_INVALID`    | error    | A field is invalid                                                   |
| `MANIFEST_BAD_PERMISSION`   | error    | Bad permission                                                       |
| `JSON_BLOCK_COMMENTS`       | error    | Block Comments are not allowed in JSON                               |
| `MANIFEST_INVALID_CONTENT`  | error    | This add-on contains forbidden content                               |
| `CONTENT_SCRIPT_NOT_FOUND`  | error    | Content script file could not be found                               |
| `CONTENT_SCRIPT_EMPTY`      | error    | Content script file name should not be empty                         |
| `NO_MESSAGE`                | error    | Translation string is missing the message                            |
| `INVALID_MESSAGE_NAME`      | error    | String name contains invalid characters                              |
| `INVALID_PLACEHOLDER_NAME`  | error    | Placeholder name contains invalid characters                         |
| `NO_PLACEHOLDER_CONTENT`    | error    | Placeholder is missing the content                                   |
| `JSON_INVALID`              | error    | JSON is not well formed                                              |
| `JSON_DUPLICATE_KEY`        | error    | Duplicate key in JSON                                                |
| `MANIFEST_VERSION_INVALID`  | error    | manifest_version in manifest.json is not valid.                      |
| `PROP_NAME_MISSING`         | error    | name property missing from manifest.json                             |
| `PROP_NAME_INVALID`         | error    | name property is invalid in manifest.json                            |
| `PROP_VERSION_MISSING`      | error    | version property missing from manifest.json                          |
| `PROP_VERSION_INVALID`      | error    | version is invalid in manifest.json                                  |
| `MANIFEST_DICT_NOT_FOUND`   | error    | A dictionary file defined in the manifest could not be found         |
| `MANIFEST_MULTIPLE_DICTS`   | error    | Multiple dictionaries found                                          |
| `MANIFEST_EMPTY_DICTS`      | error    | Empty `dictionaries` object                                          |
| `MANIFEST_DICT_MISSING_ID`  | error    | Missing `applications.gecko.id` property for a dictionary            |
