# Linter Rules

This document is automatically published on [GitHub pages](http://mozilla.github.io/addons-linter/). To update it edit `docs/rules.md` in the [GitHub repo](https://github.com/mozilla/addons-linter).

Rules are sorted by severity.

## JavaScript

| Message code                | Severity | Description                                                                            |
| --------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `KNOWN_LIBRARY`             | notice   | This is version of a JS library is known and generally accepted.                       |
| `OPENDIALOG_NONLIT_URI`     | notice   | openDialog called with non-literal parameter.                                          |
| `UNEXPECTED_GLOBAL_ARG`     | warning  | Unexpected global passed as an argument.                                               |
| `NO_IMPLIED_EVAL`           | warning  | disallow the use of `eval()`-like methods.                                             |
| `OPENDIALOG_REMOTE_URI`     | warning  | openDialog called with non-local URI.                                                  |
| `NO_DOCUMENT_WRITE`         | warning  | Use of `document.write` strongly discouraged.                                          |
| `JS_SYNTAX_ERROR`           | warning  | JavaScript compile-time error.                                                         |
| `UNADVISED_LIBRARY`         | warning  | This version of a JS library is not recommended.                                       |
| `DEPRECATED_API`            | warning  | API is deprecated.                                                                     |
| `STORAGE_SYNC`              | warning  | Temporary IDs can cause issues with `storage.sync`.                                    |
| `STORAGE_MANAGED`           | warning  | Temporary IDs can cause issues with `storage.managed`.                                 |
| `IDENTITY_GETREDIRECTURL`   | warning  | Temporary IDs can cause issues with `identity.getRedirectURL`.                         |
| `RUNTIME_ONMESSAGEEXTERNAL` | warning  | Temporary IDs can cause issues with `runtime.onMessageExternal`.                       |
| `RUNTIME_ONCONNECTEXTERNAL` | warning  | Temporary IDs can cause issues with `runtime.onConnectExternal`.                       |
| `BANNED_LIBRARY`            | error    | This version of a JS library is banned for security reasons.                           |
| `INCOMPATIBLE_API`          | warning  | API not compatible with `applications.gecko.strict_min_version`                        |
| `ANDROID_INCOMPATIBLE_API`  | warning  | API not compatible with Firefox for Android at `applications.gecko.strict_min_version` |

## Markup

### HTML

| Message code    | Severity | Description                                            |
| --------------- | -------- | ------------------------------------------------------ |
| `INLINE_SCRIPT` | warning  | Inline script is disallowed by CSP.                    |
| `REMOTE_SCRIPT` | warning  | Remote scripts are not allowed as per Add-on Policies. |

## Content

| Message code   | Severity | Description             |
| -------------- | -------- | ----------------------- |
| `HIDDEN_FILE`  | warning  | Hidden file flagged.    |
| `FLAGGED_FILE` | warning  | Flagged filename found. |

## Package layout

| Message code               | Severity | Description                                                                      |
| -------------------------- | -------- | -------------------------------------------------------------------------------- |
| `MOZILLA_COND_OF_USE`      | notice   | Mozilla conditions of use violation.                                             |
| `FLAGGED_FILE_TYPE`        | notice   | (Binary) Flagged file type found.                                                |
| `FLAGGED_FILE_EXTENSION`   | warning  | Flagged file extensions found                                                    |
| `ALREADY_SIGNED`           | warning  | Already signed                                                                   |
| `COINMINER_USAGE_DETECTED` | warning  | Firefox add-ons are not allowed to run coin miners.                              |
| `DUPLICATE_XPI_ENTRY`      | error    | Package contains duplicate entries.                                              |
| `INVALID_XPI_ENTRY`        | error    | Package contains invalid entries (e.g. invalid characters in entries path name). |
| `BAD_ZIPFILE`              | error    | Bad zip file.                                                                    |
| `FILE_TOO_LARGE`           | error    | File is too large to parse                                                       |
| `RESERVED_FILENAME`        | error    | Reserved filename detected.                                                      |

## Type detection

| Message code            | Severity | Description                                      |
| ----------------------- | -------- | ------------------------------------------------ |
| `TYPE_NO_MANIFEST_JSON` | notice   | Add-on missing manifest_json for type detection. |

## Language packs

| Message code     | Severity | Description                   |
| ---------------- | -------- | ----------------------------- |
| `FLUENT_INVALID` | warning  | Invalid fluent template file. |

## Web Extensions / manifest.json

| Message code                                            | Severity | Description                                                                                                                                                                        |
| ------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MANIFEST_UNUSED_UPDATE`                                | notice   | update_url ignored in manifest.json                                                                                                                                                |
| `CORRUPT_ICON_FILE`                                     | warning  | Icons must not be corrupt                                                                                                                                                          |
| `MANIFEST_CSP`                                          | warning  | content_security_policy in manifest.json means more review                                                                                                                         |
| `MANIFEST_CSP_UNSAFE_EVAL`                              | warning  | usage of 'unsafe-eval' is strongly discouraged                                                                                                                                     |
| `MANIFEST_PERMISSIONS`                                  | warning  | Unknown permission                                                                                                                                                                 |
| `MANIFEST_OPTIONAL_PERMISSIONS`                         | warning  | Unknown optional permission                                                                                                                                                        |
| `MANIFEST_HOST_PERMISSIONS`                             | warning  | Unknown host permission                                                                                                                                                            |
| `NO_MESSAGES_FILE`                                      | warning  | When default_locale is specified a matching messages.json must exist                                                                                                               |
| `NO_DEFAULT_LOCALE`                                     | warning  | When \_locales directory exists, default_locale must exist                                                                                                                         |
| `UNSAFE_VAR_ASSIGNMENT`                                 | warning  | Assignment using dynamic, unsanitized values                                                                                                                                       |
| `UNSUPPORTED_API`                                       | warning  | Unsupported or unknown browser API                                                                                                                                                 |
| `DANGEROUS_EVAL`                                        | warning  | `eval` and the `Function` constructor are discouraged                                                                                                                              |
| `STRICT_MAX_VERSION`                                    | warning  | strict_max_version not required                                                                                                                                                    |
| `PREDEFINED_MESSAGE_NAME`                               | warning  | String name is reserved for a predefined                                                                                                                                           |
| `MISSING_PLACEHOLDER`                                   | warning  | Placeholder for message is not                                                                                                                                                     |
| `MANIFEST_FIELD_PRIVILEGEDONLY`                         | warning  | A manifest field ignored on non-privileged extensions                                                                                                                              |
| `MANIFEST_FIELD_UNSUPPORTED`                            | warning  | A manifest field is not supported (or not supported for the extension manifest_version)                                                                                            |
| `MANIFEST_PERMISSION_UNSUPPORTED`                       | warning  | A manifest permission is not supported for the extension manifest_version                                                                                                          |
| `MANIFEST_PERMISSIONS_PRIVILEGED`                       | error    | A manifest permission is only allowed in privileged extensions                                                                                                                     |
| `MOZILLA_ADDONS_PERMISSION_REQUIRED`                    | error    | The "mozillaAddons" permission must be specified in privileged extensions                                                                                                          |
| `PRIVILEGED_FEATURES_REQUIRED`                          | error    | Privileged features are mandatory for privileged extensions, but none has been detected                                                                                            |
| `MANIFEST_FIELD_PRIVILEGED`                             | error    | A manifest field is only allowed in privileged extensions                                                                                                                          |
| `WRONG_ICON_EXTENSION`                                  | error    | Icons must have valid extension                                                                                                                                                    |
| `MANIFEST_UPDATE_URL`                                   | error    | update_url not allowed in manifest.json                                                                                                                                            |
| `MANIFEST_FIELD_REQUIRED`                               | error    | A required field is missing                                                                                                                                                        |
| `MANIFEST_FIELD_INVALID`                                | error    | A field is invalid                                                                                                                                                                 |
| `MANIFEST_FIELD_DEPRECATED`                             | error    | A field is deprecated                                                                                                                                                              |
| `MANIFEST_BAD_PERMISSION`                               | error    | Bad permission                                                                                                                                                                     |
| `MANIFEST_BAD_OPTIONAL_PERMISSION`                      | error    | Bad optional permission                                                                                                                                                            |
| `MANIFEST_BAD_HOST_PERMISSION`                          | error    | Bad host permission                                                                                                                                                                |
| `MANIFEST_INSTALL_ORIGINS`                              | error    | Invalid install_origins                                                                                                                                                            |
| `JSON_BLOCK_COMMENTS`                                   | error    | Block Comments are not allowed in JSON                                                                                                                                             |
| `MANIFEST_INVALID_CONTENT`                              | error    | This add-on contains forbidden content                                                                                                                                             |
| `CONTENT_SCRIPT_NOT_FOUND`                              | error    | Content script file could not be found                                                                                                                                             |
| `CONTENT_SCRIPT_EMPTY`                                  | error    | Content script file name should not be empty                                                                                                                                       |
| `NO_MESSAGE`                                            | error    | Translation string is missing the message                                                                                                                                          |
| `INVALID_MESSAGE_NAME`                                  | error    | String name contains invalid characters                                                                                                                                            |
| `INVALID_PLACEHOLDER_NAME`                              | error    | Placeholder name contains invalid characters                                                                                                                                       |
| `NO_PLACEHOLDER_CONTENT`                                | error    | Placeholder is missing the content                                                                                                                                                 |
| `JSON_INVALID`                                          | error    | JSON is not well formed                                                                                                                                                            |
| `JSON_DUPLICATE_KEY`                                    | error    | Duplicate key in JSON                                                                                                                                                              |
| `MANIFEST_VERSION_INVALID`                              | error    | manifest_version in manifest.json is not valid                                                                                                                                     |
| `PROP_NAME_MISSING`                                     | error    | The name property is missing from manifest.json                                                                                                                                    |
| `PROP_NAME_INVALID`                                     | error    | The name property is invalid in manifest.json, either because the string has leading/trailing whitespaces or because its length is too short (must be 2 non-whitespace characters) |
| `MANIFEST_DICT_NOT_FOUND`                               | error    | A dictionary file defined in the manifest could not be found                                                                                                                       |
| `MANIFEST_MULTIPLE_DICTS`                               | error    | Multiple dictionaries found                                                                                                                                                        |
| `MANIFEST_EMPTY_DICTS`                                  | error    | Empty `dictionaries` object                                                                                                                                                        |
| `MANIFEST_DICT_MISSING_ID`                              | error    | Missing `applications.gecko.id` property for a dictionary                                                                                                                          |
| `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`                | warning  | Manifest key not compatible with `applications.gecko.strict_min_version`                                                                                                           |
| `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION`        | warning  | Manifest key not compatible with Firefox for Android at `applications.gecko.strict_min_version`                                                                                    |
| `PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`         | notice   | Permission not compatible with `applications.gecko.strict_min_version`                                                                                                             |
| `PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` | notice   | Permission not compatible with Firefox for Android at `applications.gecko.strict_min_version`                                                                                      |
| `IGNORED_APPLICATIONS_PROPERTY`                         | warning  | Usage of both `applications` and `browser_specific_settings` properties                                                                                                            |
| `RESTRICTED_HOMEPAGE_URL`                               | error    | Linking to addons.mozilla.org in `homepage_url` or `developer.url` is not allowed                                                                                                  |
| `RESTRICTED_PERMISSION`                                 | error    | A permission requires "strict_min_version" to be set to a specific Firefox version                                                                                                 |
| `EXTENSION_ID_REQUIRED`                                 | error    | The extension ID is mandatory for Manifest Version 3 (and above) extensions                                                                                                        |
| `HIDDEN_NO_ACTION`                                      | error    | The `hidden` and `browser_action`/`page_action` (or `action`) properties are mutually exclusive                                                                                    |
| `APPLICATIONS_DEPRECATED`                               | warning  | The `applications` property in the manifest is deprecated and will no longer be accepted in Manifest Version 3 and above. Use `browser_specific_settings` instead.                 |
| `APPLICATIONS_INVALID`                                  | error    | The `applications` property is no longer accepted in Manifest Version 3 and above                                                                                                  |
| `VERSION_FORMAT_DEPRECATED`                             | warning  | The version string should be simplified                                                                                                                                            |
| `VERSION_FORMAT_INVALID`                                | error    | The version string is not valid because its format is too complex.                                                                                                                 |
| `INCOGNITO_SPLIT_UNSUPPORTED`                           | warning  | The incognito "split" value is unsupported in Firefox                                                                                                                              |
| `ADMIN_INSTALL_ONLY_PROP_RESERVED`                      | error    | The `browser_specific_settings.gecko.admin_install_only` property is reserved and can only be used in enterprise add-ons                                                           |
| `ADMIN_INSTALL_ONLY_REQUIRED`                           | error    | The `browser_specific_settings.gecko.admin_install_only` property must be set to "true" in an enterprise add-on                                                                    |
| `DATA_COLLECTION_PERMISSIONS_PROP_RESERVED`             | error    | The `browser_specific_settings.gecko.data_collection_permissions` property is reserved for future usage and cannot be used in an extension at the moment                           |
| `MISSING_DATA_COLLECTION_PERMISSIONS`                   | notice   | The `browser_specific_settings.gecko.data_collection_permissions` will be required in the future. Please add this key to the manifest                                              |
| `NONE_DATA_COLLECTION_IS_EXCLUSIVE`                     | error    | "none" must not be specified with other required data collection permissions                                                                                                       |
| `HAS_PREVIOUS_CONSENT_IS_RESERVED`                      | error    | The `/browser_specific_settings/gecko/data_collection_permissions/has_previous_consent` property is reserved and cannot be set to `true`.                                          |

### Static Theme / manifest.json

| Message code                         | Severity | Description                                                 |
| ------------------------------------ | -------- | ----------------------------------------------------------- |
| `MANIFEST_THEME_IMAGE_MIME_MISMATCH` | warning  | Theme image file extension should match its mime type       |
| `MANIFEST_THEME_IMAGE_NOT_FOUND`     | error    | Theme images must not be missing                            |
| `MANIFEST_THEME_IMAGE_CORRUPTED`     | error    | Theme images must not be corrupted                          |
| `MANIFEST_THEME_IMAGE_WRONG_EXT`     | error    | Theme images must have one of the supported file extensions |
| `MANIFEST_THEME_IMAGE_WRONG_MIME`    | error    | Theme images mime type must be a supported format           |
| `MANIFEST_THEME_LWT_ALIAS`           | error    | Theme LWT aliases are deprecated                            |
