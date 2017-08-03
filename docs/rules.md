
# Linter Rules

This document is automatically published on [github pages](http://mozilla.github.io/addons-linter/).
To update it edit `docs/rules.md` in the
[github repo](https://github.com/mozilla/addons-linter).

* :white_check_mark: means the rule has been ported/implemented
* :negative_squared_cross_mark: means the rule has been removed
* :x: means the rule hasn't been ported yet

A :white_check_mark: next to a section of rules means they have all been filed in our [issues database](https://github.com/mozilla/addons-validator/issues).

## JavaScript

### Actions :white_check_mark:

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | dangerous_contract | | Dangerous XPCOM contract ID |  | [testcases/javascript/actions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/actions.py) | ('js', 'actions', 'dangerous_contract') | **Removed** |
| :x: | warning | called_dangerous_global | | `%s` called in potentially dangerous manner' | | | | |
| :white_check_mark: | warning | eval | | In order to prevent vulnerabilities, the `setTimeout` 'and `setInterval` functions should be called only with function expressions as their first argument. | | [testcases/javascript/actions.py](https://github.com/mozilla/amo-validator/blob/7a8011aba8bf8c665aef2b51eb26d0697b3e19c3/validator/testcases/javascript/actions.py#L488) | | NO_IMPLIED_EVAL |
| :negative_squared_cross_mark: | notice |  \_readonly_top | | window.top is a reserved variable | | | ('testcases_javascript_actions', '_readonly_top' | **Removed** |
| :x: | warning | global_overwrite | | Global variable overwrite | | | | |
| :white_check_mark: | warning | unexpected_global_arg [NEW] | | Unexpected global passed as an argument | | | null | UNEXPECTED_GLOGAL_ARG |

### Call definitions :white_check_mark:
| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | webbrowserpersist | | nsIWebBrowserPersist should no longer be used |  | [testcases/javascript/call_definitions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/call_definitions.py)| ('testcases_javascript_call_definititions', 'webbrowserpersist') | **Removed** |
| :negative_squared_cross_mark: | warning | webbrowserpersist_saveuri | | saveURI should not be called with a null load context | | | ('testcases_javascript_call_definititions', 'webbrowserpersist_saveuri') | **Removed** |
| :negative_squared_cross_mark: | notice | deprec | | Deprecated nsIJSON methods in use | | | ('testcases_javascript_calldefinitions', 'nsIJSON', 'deprec') | **Removed** |
| :negative_squared_cross_mark: | notice | %s_nonliteral | | `%s` called with non-literal parameter. | | | | |
| :white_check_mark: | notice | opendialog_nonlit_uri |  | openDialog called with non-literal parameter | | | ('js', 'instanceactions', 'openDialog_nonliteral' | OPENDIALOG_NONLIT_URI |
| :negative_squared_cross_mark: | warning | %s_remote_uri | | `%s` called with non-local URI. | | | | |
| :white_check_mark: | warning | opendialog_remote_uri |  | openDialog called with non-local URI | | | ('js', 'instanceactions', 'openDialog_remote_uri' | OPENDIALOG_REMOTE_URI |

###  Entity values

*Deprecated entities are checked with a generated set of rules*

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | deprecated_entity | | THIS IS A GENERATED ERROR |  | [testcases/javascript/entity_values.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/entity_values.py)| | |
| :white_check_mark: | warning | evil | | Use of `document.write` strongly discouraged. | | | [testcases/javascript/entity_values.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/entity_values.py#L64) | NO_DOCUMENT_WRITE |
| :white_check_mark: | warning | override | | Extensions must not alter user preferences such as the new tab URL without explicit user consent.  | | |

### instanceactions

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | notice | addEventListener_fourth | | `addEventListener` called with truthy fourth argument |  | [testcases/javascript/instanceactions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceactions.py)| | EVENT_LISTENER_FOURTH |
| :x: | warning | called_createelement | | createElement() used to create script tag | | | | |
| :x: | warning | createelement_variable | | Variable element type being created | | | | |
| :x: | warning | setting_on\*  | | on\* attribute being set using setAttribute | | | | |
| :negative_squared_cross_mark: | warning | launch | | Potentially dangerous use of `launch()` | | | | |
| :negative_squared_cross_mark: | warning | executeSimpleSQL_dynamic | | SQL statements should be static strings | | | | |
| :negative_squared_cross_mark: | warning | executeSimpleSQL | | Synchronous SQL should not be used | | | | |
| :x: | warning | called_set_preference | | Attempt to set a dangerous preference | | | | |


### instanceproperties

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | warning | event_assignment | | Event handler assignment via %s |  | [testcases/javascript/instanceproperties.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceproperties.py)| | |
| :x: | warning | script_assignment | | Scripts should not be created with `%s` | | | | |
| :x: | warning | variable_assignment | | Markup should not be passed to `%s` dynamically. | | | | |
| :x: | warning | on\*_str_assignment | | on\* property being assigned string | | | | |
| :negative_squared_cross_mark: | warning | handleEvent | | `handleEvent` no longer implemented in Gecko 18 | | | | |
| :negative_squared_cross_mark: | warning | \_\_proto\_\_ | | Using `__proto__` or `setPrototypeOf` to set a prototype is now deprecated | | | | |
| :negative_squared_cross_mark: | warning | \_\_exposedProps\_\_ | | Use of deprecated `__exposedProps__` declaration | | | | |
| :negative_squared_cross_mark: | warning | set_non_literal | | `contentScript` properties should not be used | | | | |

### jsshell

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | warning | syntax_error | | JavaScript Compile-Time Error |  | [testcases/javascript/jsshell.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jsshell.py)| | JS_SYNTAX_ERROR |
| :negative_squared_cross_mark: | notice | recursion_error | | JS too deeply nested for validation | | | | |
| :negative_squared_cross_mark: | error | retrieving_tree | | JS reflection error prevented validation | | | | |

### jstypes

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | unwrapped_js_object | | Assignment of unwrapped JS Object's properties |  | [testcases/javascript/jstypes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jstypes.py)| | |
| :negative_squared_cross_mark: | warning | const_overwrite | | Overwritten constant value | | | | |
| :negative_squared_cross_mark: | warning | global_overwrite | | Global overwrite. An attempt to overwrite a global variable was made in some JS code | | | | |
| :negative_squared_cross_mark: | warning | global_member_deletion | | Members of global object may not be deleted | | | | |
| :negative_squared_cross_mark: | warning | jetpack_abs_uri |  | Absolute URIs in Jetpack 1.4 are disallowed | | | | |

### predefinedentities

*this file appear to contain lot of data but looks to be used elsewhere a second pass would be good to check*

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | dangerous_global | | The FUEL library is now deprecated |  | [testcases/javascript/predefinedentities.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/predefinedentities.py)| | |
| :negative_squared_cross_mark: | warning | changes (search_service) | | Potentially dangerous use of the search service | | | |  |
| :negative_squared_cross_mark: | warning | write (windows_registry) | | Writes to the registry may be dangerous | | | | |

### Traverser

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | namespace_pollution | | JavaScript namespace pollution |  | [testcases/javascript/traverser.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/traverser.py)| | |
| :negative_squared_cross_mark: | warning | dangerous_global | | Access to the `%s` property is deprecated for security or other reasons. | | | | |

### Libraries
| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | error | BANNED_LIBRARY | | This version of a JS library is banned for security reasons. | | | | BANNED_LIBRARY |
| :white_check_mark: | warning | UNADVISED_LIBRARY | | This version of a JS library is not recommended. | | | | UNADVISED_LIBRARY |
| :white_check_mark: | notice | KNOWN_LIBRARY | This version of a JS library is known and generally accepted. | | | blacklisted_js_library | KNOWN_LIBRARY |

## Markup

### CSS

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | -moz-binding_external | | Illegal reference to external scripts |  | [testcases/markup/csstester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/csstester.py)| | |
| :x: | warning | remote_url | | Themes may not reference remote resources | | | | |
| :negative_squared_cross_mark: | warning | identity_box | | Modification to identity box | | | | |
| :x: | info? (should be an error) | unicode_decode | | Unicode decode error. | | | | |
| :white_check_mark: | error | CSS syntax error | | A CSS syntax error was detected | | N/A | N/A | CSS_SYNTAX_ERROR |
| :white_check_mark: | error | Invalid nesting | | CSS selectors should not be nested | | N/A | N/A | INVALID_SELECTOR_NESTING |

### HTML

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | warning | parse_error | | There was an error parsing a markup file |  | [testcases/markup/markuptester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/markuptester.py)| | |
| :negative_squared_cross_mark: | error | banned_element | | A banned markup element was found | | | | |
| :negative_squared_cross_mark: | warning | unsafe_theme_xbl_element | theme | Certain XBL elements are disallowed in full themes | | | | |
| :negative_squared_cross_mark: | warning | theme_xbl_property | theme | Themes are not allowed to use XBL properties | | | | |
| :negative_squared_cross_mark: | warning | unsafe_langpack_theme | theme / langpack | Unsafe tag for add-on type | | | | |
| :x: | warning | remote_src_href | theme / langpack | `src`/`href` attributes must be local | | | | |
| :x: | warning | iframe_type_unsafe | | iframe/browser missing 'type' attribute | | | | |
| :x: | warning | iframe_type_unsafe | | Typeless iframes/browsers must be local | | | | |
| :x: | warning | banned_remote_scripts | | Scripts must not be remote | | | | |
| :negative_squared_cross_mark: | warning | jetpack_abs_uri | | Absolute URI referenced in Jetpack 1.4 | | | | |
| :negative_squared_cross_mark: | warning | theme_attr_prefix | theme | Attribute contains banned prefix | | | | |
| :negative_squared_cross_mark: | warning | dom_manipulation_handler | | DOM Mutation Events Prohibited | | | | |
| :negative_squared_cross_mark: | warning | generic_ids | | Overlay contains generically-named IDs | | | | |
| :x: | warning | complex_script | | Long inline script | | | | |
| :x: | warning | extra_closing_tags | | Markup parsing error | | | | |
| :x: | warning | extra_closing_tags | | Parse error: tag closed before opened | | | | |
| :x: | warning | invalid_nesting | | Markup invalidly nested | | | | |
| :white_check_mark: | warning | inline script | | Inline script is disallowed by CSP | | | | INLINE_SCRIPT |
| :white_check_mark: | warning | remote script | | Remote scripts are not allowed as per Add-on Policies | | | | REMOTE_SCRIPT |

## Content

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | found_in_chrome_manifest| | xpcnativewrappers not allowed in chrome.manifest |  chrome.manifest | [testcases/content.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/content.py)| | |
| :negative_squared_cross_mark: | warning | found_in_chrome_manifest| | newTab.xul is now newTab.xhtml |  chrome.manifest | | | |
| :white_check_mark: | warning | hidden_files | | Hidden file flagged | | | [testcases/content.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/content.py) | HIDDEN_FILE |
| :white_check_mark: | warning | flagged_files | | Flagged filename found | | |[testcases/content.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/content.py) | FLAGGED_FILE |
| :negative_squared_cross_mark: | warning | invalid_chrome_url | | Invalid chrome URL | | | | |
| :x: | warning | too_much_js | | TOO MUCH JS FOR EXHAUSTIVE VALIDATION | | | | |
| :negative_squared_cross_mark: | error | unsigned_sub_xpi | | Sub-package must be signed | | | | |
| :x: | warning | signed_xpi | | Package already signed | | | | |
| :negative_squared_cross_mark: | error | jar_subpackage_corrupt  | | Subpackage corrupt | | | | |


## Install.rdf

TODO: A lot of these are generated so this will need expanded with each unique code.

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | error | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_HIDDEN |
| :white_check_mark: | error | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_UPDATEKEY |
| :white_check_mark: | error | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_UPDATEURL |
| :white_check_mark: | notice | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_FILE |
| :white_check_mark: | notice | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_REQUIRES |
| :white_check_mark: | notice | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_SKIN |
| :negative_squared_cross_mark: | warning | optionsType | | `<em:optionsType>` has bad value. | install.rdf | | | |
| :negative_squared_cross_mark: | notice | unrecognized | | Unrecognized element in install.rdf | install.rdf | | | |
| :negative_squared_cross_mark: | notice | missing_updateKey | | Missing updateKey element | install.rdf | | | |
| :negative_squared_cross_mark: | notice | Missing updateURL element | | Missing updateURL element | install.rdf | | | |
| :negative_squared_cross_mark: | error | missing_addon | | install.rdf missing element(s). | install.rdf | | | |
| :white_check_mark: | error | | | top level guid must be 255 characters or less | install.rdf | | | RDF_GUID_TOO_LONG |
| :white_check_mark: | error | | | top level guid missing from install.rdf | install.rdf | | | RDF_ID_MISSING |
| :white_check_mark: | error | | | top level version missing from install.rdf. | install.rdf | | | RDF_VERSION_MISSING |
| :white_check_mark: | error | | | top level name missing from install.rdf | install.rdf | | | RDF_NAME_MISSING |


## Jetpack

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | mismatched_version | | Jetpack module version mismatch |  | [testcases/jetpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/jetpack.py) | | |
| :negative_squared_cross_mark: | warning | extra_hashes | | Extra hashes registered in harness-options | harness-options.json | | | |
| :negative_squared_cross_mark: | warning | bad_harness-options.json | | harness-options.json is not decodable JSON | harness-options.json | | | |
| :negative_squared_cross_mark: | warning | harness-options_missing_elements | | Elements are missing from harness-options.json | harness-options.json | | | |
| :negative_squared_cross_mark: | error | redacted_version | | Unsupported version of Add-on SDK | | | | |
| :negative_squared_cross_mark: | warning | outdated_version | | Outdated version of Add-on SDK | | | | |
| :negative_squared_cross_mark: | notice | future_version | | Future version of Add-on SDK unrecognized | | | | |
| :negative_squared_cross_mark: | warning | irregular_module_location | | Irregular Jetpack module location | harness-options.json | | | |
| :negative_squared_cross_mark: | warning | irregular_module_elements | | Irregular Jetpack module elements | harness-options.json | | | |
| :negative_squared_cross_mark: | warning | missing_jetpack_module | | Missing Jetpack module | harness-options.json | | | |
| :negative_squared_cross_mark: | warning | mismatched_checksum | | Jetpack module hash mismatch | | | | |


## l10ncompleteness

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | warning | manager_absent | | Listed locale does not exist   | chrome.manifest | [testcases/l10ncompleteness.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/l10ncompleteness.py) | | |
| :x: | notice | no_locales | | Add-on appears not to be localized | chrome.manifest | | | |
| :x: | info? | missing_app_support |  | Supported app missing in localization completeness | | | | |
| :x: | warning | find_corresponding_locale | | Could not find corresponding locale | chrome.manifest | | | |
| :x: | warning | missing_file | | Missing translation file | | | | |
| :x: | warning | missing_translation_entity | | Missing translation entity |   | | | |
| :x: | notice | unchanged_entities | | Unchanged translation entities | | | | |
| :x: | warning | unexpected_encodings | | Unexpected encodings in locale files | | | | |


## langpacks

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | warning | invalid_subject | | Invalid chrome.manifest subject. chrome.manifest files in language packs are only allowed to contain items that are prefixed with 'locale', 'manifest', or 'override' | chrome.manifest | [testcases/langpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/langpack.py) | | |
| :x: | warning | invalid_override | | Invalid chrome.manifest object/predicate. | chrome://\*/locale/\* | | | |
| :x: | warning | unsafe_content_html | | Unsafe HTML found in language pack files | | | | |
| :x: | warning | unsafe_content_link | | Unsafe remote resource found in language pack | | | | |


## package.json :white_check_mark:

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | error | field_required | | Your package.json is missing a required field | | [testcases/packagejson.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagejson.py) | | |


## Package layout :white_check_mark:

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | notice | deprecated_file | |  Extension contains a deprecated file | | [testcases/packagelayout.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py) | | |
| :x: | warning | FLAGGED_FILE_TYPE_type | | Flagged file type found | | | | |
| :white_check_mark: | error | FILE_TOO_LARGE | webextension | File is too large to parse | | | | FILE_TOO_LARGE |
| :x: | warning | java_jar | | Java JAR file detected | | | | |
| :white_check_mark: | warning | disallowed_extension | | Flagged file extensions found | | https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py | | FLAGGED_FILE_EXTENSION |
| :negative_squared_cross_mark: | error | test_godlikea | | Banned 'godlikea' chrome namespace | | | | |
| :white_check_mark: | notice | disallowed_type | | (Binary) Flagged file type found | | https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py | | FLAGGED_FILE_TYPE |
| :negative_squared_cross_mark: | error | missing_install_rdf | | Add-on missing install.rdf | | | | |
| :white_check_mark: | warning | duplicate_entries | | Package contains duplicate entries | | | | DUPLICATE_XPI_ENTRY |
| :negative_squared_cross_mark: | warning | should_be_true | | Add-on should set `<em:unpack>` to true | | | | |
| :negative_squared_cross_mark: | notice | should_be_false | | Add-on contains JAR files, no `<em:unpack>` | | | | |
| :x: | warning | unknown_file | | Unknown file found in add-on | | | | |
| :x: | warning | missing_required | | Required file missing | | | | |
| :white_check_mark: | error |  |  | Bad zip file  | |  | | BAD_ZIPFILE |
| :white_check_mark: | warning |  |  | Already signed  | | https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py  | | ALREADY_SIGNED |

## Type detection

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | notice | missing_install_rdf | | Add-on missing install.rdf for type detection | | [22](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L22) | ('typedetection', 'detect_type', 'missing_install_rdf') | TYPE_NO_INSTALL_RDF |
| :white_check_mark: | notice | missing_manifest_json | | Add-on missing manifest_json for type detection | | | ('typedetection', 'detect_type', 'missing_manifest_json') | TYPE_NO_MANIFEST_JSON |
| :white_check_mark: | error | invalid_em_type | | The only valid values for `<em:type>` are 2, 4, 8, and 32 | | [46](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L46) | ('typedetection', 'detect_type', 'invalid_em_type') | RDF_TYPE_INVALID |
| :white_check_mark: | notice | no_em:type | | No `<em:type>` element found in install.rdf | | [66](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L66) | ('typedetection', 'detect_type', 'no_em:type') | RDF_TYPE_MISSING |
| :white_check_mark: | notice | no_em:name | | No `<em:name>` element found in install.rdf | | [66](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L66) | new rule | RDF_NAME_MISSING |
| :white_check_mark: | error | undeterminable_type | | Unable to determine add-on type | | [195](https://github.com/mozilla/amo-validator/blob/master/validator/submain.py#L195) | ('main', 'test_package', 'undeterminable_type') | TYPE_NOT_DETERMINED |


## Themes

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | invalid_chrome_manifest_subject | theme | chrome.manifest files for full themes are only allowed to have 'skin' and 'style' items. Other types of items are disallowed for security reasons.' | chrome.manifest | [testcases/themes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) | | |
| :negative_squared_cross_mark: | warning | theme_js | theme | Themes should not contain executable code. | \*.js | [testcases/scripting.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) | | |


## Target Versions

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | error | invalid_min_version | addon? |  The minimum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | [testcases/targetapplication.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/targetapplication.py) | | |
| :negative_squared_cross_mark: | error | invalid_max_version | addon? |  The maximum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | | | |
| :negative_squared_cross_mark: | error | invalid_version_order | addon? | The version numbers provided for the application in question are not in the correct order. The maximum version must be greater than the minimum version.' | install.rdf | | | |
| :negative_squared_cross_mark: | warning | missing_minversion | addon? | Missing minVersion property. A targetApplication element is missing its minVersion property. This may cause it to be ignored as invalid. | install.rdf | | | |
| :negative_squared_cross_mark: | warning | missing_maxversion | addon? | Missing maxVersion property. A targetApplication element is missing its maxVersion property. This may cause it to be ignored as invalid. | install.rdf | | | |
| :negative_squared_cross_mark: | warning | duplicate_targetapps | addon? | Found duplicate `<em:targetApplication>` elements. Multiple targetApplication elements were found in the install.manifest file that refer to the same application GUID. There should not be duplicate target applications entries. | install.rdf | | | |
| :negative_squared_cross_mark: | error | no_mozilla_support | addon? | None of the target applications listed in 'install.rdf are supported Mozilla products. At least one official Mozilla product must be supported for inclusion on addons.mozilla.org. See [appversions](https://addons.mozilla.org/firefox/pages/appversions/) for more information on supported target applications on AMO.' | install.rdf | | | |

## Regex Tests

*Note the rule names for these do not come from the code*

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | invalid_sync_services_object_reuse |   | Sync services objects are not intended to be re-used |  | [testcases/regex.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/regex.py) | | |
| :x: | warning | warn_mouse_events |   | Mouse events may cause performance issues |  |  | | |
| :x: | warning | dom_mutation_events_disallowed |  | DOM mutation event use prohibited |  | | | |
| :negative_squared_cross_mark: | warning | new_tab_override |  |  Possible attempt to override new tab page |  | | | |
| :x: | warning | unsafe_template_escape |  | Potentially unsafe template escape sequence | | | | |
| :x: | warning | js_protoype_extension_dissallowed |  | JS prototype extension not allowed  | | | | |
| :white_check_mark: | warning | mozindexdb_removed |  | mozIndexedDB has been removed |  | | | MOZINDEXEDDB |
| :white_check_mark: | warning | mozIndexedDB property is deprecated |  | mozIndexedDB has been removed |  | N/A | N/A | MOZINDEXEDDB_PROPERTY |
| :negative_squared_cross_mark: | warning | composition_features_removed |  | nsICompositionStringSynthesizer, sendCompositionEvent and createCompositionStringSynthesizer were removed | | | | |
| :negative_squared_cross_mark: | warning | asyncfetch2_newchannel2_deprecated |  | asyncFetch2 and newChannel2 are now deprecated | | | | |
| :negative_squared_cross_mark: | warning | onproxyavailable_asyncresolve_changed |  | The onProxyAvailable and asyncResolve functions have changed |  | | | |
| :negative_squared_cross_mark: | warning | noSuchMethod_deprecated |  | The \_\_noSuchMethod__ property has been deprecated |  | | | |
| :negative_squared_cross_mark: | warning | sendAsBinary_removed |  | The function sendAsBinary() in XMLHttpRequest has been removed |  | | | |
| :negative_squared_cross_mark: | warning | theme_prefs_changed | | The preferences used to store theme selection have changed |  | | | |
| :negative_squared_cross_mark: | warning | old_keywords_api_deprecated | | The old keywords API is deprecated | | | | |
| :negative_squared_cross_mark: | warning | fuel_library_deprecated | | The FUEL library is now deprecated | | | | |
| :negative_squared_cross_mark: | warning | dictjsm_removed | | The Dict.jsm module has been removed | | | | |
| :negative_squared_cross_mark: | warning | sessionstore_state_write_removed | | The sessionstore-state-write notification has been removed. | | | | |
| :negative_squared_cross_mark: | warning | nsISSLErrorListener_removed | | The nsISSLErrorListener interface has been removed |  | | | |
| :negative_squared_cross_mark: | warning | widget_module_removed | | The widget module has been removed | | | | |
| :negative_squared_cross_mark: | warning | user_profile_data_reference | | Reference to critical user profile data | | | | |
| :negative_squared_cross_mark: | warning | em_action_requested | | Obsolete Extension Manager API | | | | |
| :negative_squared_cross_mark: | warning | unsafe_pref_branch_ref | | Potentially unsafe preference branch  referenced (x2) | | | | |
| :negative_squared_cross_mark: | warning | browsernewtaburl_pref_removed |  |  The browser.newtab.url preference has been removed | | | | |
| :negative_squared_cross_mark: | warning | password_stored_in_prefs | | Passwords should not be stored in preferences | | | | |

## Thunderbird Regex Tests

*Note the rule names for these do not come from the code*


| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :negative_squared_cross_mark: | warning | removed_labels_in_use |  | Removed labels in use (Repeated for multiple versions) | | | | |

## Web Extensions

*Note these are all new and don't exist in the old validator*

| Done? | MsgType | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | ------- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | error | Web extension | JSON is not well formed. | manifest.json | | null | JSON_INVALID |
| :white_check_mark: | error | Web extension | Duplicate key in JSON. | manifest.json | | null | JSON_DUPLICATE_KEY |
| :white_check_mark: | error | Web extension | manifest_version in manifest.json is not valid. | manifest.json | | null | MANIFEST_VERSION_INVALID |
| :white_check_mark: | error | Web extension | name property missing from manifest.json | manifest.json | | null | PROP_NAME_MISSING |
| :white_check_mark: | error | Web extension | name property is invalid in manifest.json | manifest.json | | null | PROP_NAME_INVALID |
| :white_check_mark: | error | Web extension | version property missing from manifest.json | manifest.json | | null | PROP_VERSION_MISSING |
| :white_check_mark: | error | Web extension | version is invalid in manifest.json | manifest.json | | null | PROP_VERSION_INVALID |
| :white_check_mark: | notice | Web extension | version is in the toolkit format in manifest.json | manifest.json | | null | PROP_VERSION_TOOLKIT_ONLY |
| :white_check_mark: | error | Web extension | install.rdf and manifest.json present | manifest.json | | null | MULTIPLE_MANIFESTS |
| :white_check_mark: | warning | Web extension | content_security_policy in manifest.json means more review | manifest.json | | null | MANIFEST_CSP |
| :white_check_mark: | error | Web extension | update_url not allowed in manifest.json | manifest.json | | null | MANIFEST_UPDATE_URL |
| :white_check_mark: | notice | Web extension | update_url ignored in manifest.json | manifest.json | | null | MANIFEST_UNUSED_UPDATE |
| :white_check_mark: | error | Web extension | A required field is missing | manifest.json | | null | MANIFEST_FIELD_REQUIRED |
| :white_check_mark: | error | Web extension | A field is invalid | manifest.json | | null | MANIFEST_FIELD_INVALID |
| :white_check_mark: | error | Web extension | Bad permission | manifest.json | | null | MANIFEST_BAD_PERMISSION |
| :white_check_mark: | warning | Web extension | Unknown permission | manifest.json | | null | MANIFEST_PERMISSIONS |
| :white_check_mark: | error | Web extension | Block Comments are not allowed in JSON | manifest.json | | null | JSON_BLOCK_COMMENTS |
| :white_check_mark: | warning | Web extension | Deprecated API tabs.getSelected | | | null | TABS_GETSELECTED |
| :white_check_mark: | warning | Web extension | Deprecated API tabs.sendRequest | | | null | TABS_SENDREQUEST |
| :white_check_mark: | warning | Web extension | Deprecated API tabs.getAllInWindow | | | null | TABS_GETALLINWINDOW |
| :white_check_mark: | warning | Web extension | Deprecated API tabs.onSelectionChanged | | | null | TABS_ONSELECTIONCHANGED |
| :white_check_mark: | warning | Web extension | Deprecated API tabs.onActiveChanged | | | null | TABS_ONACTIVECHANGED |
| :white_check_mark: | warning | Web extension | Deprecated API extension.sendRequest | | | null | EXT_SENDREQUEST |
| :white_check_mark: | warning | Web extension | Deprecated API extension.onRequestExternal | | | null | EXT_ONREQUESTEXTERNAL |
| :white_check_mark: | warning | Web extension | Deprecated API extension.onRequest | | | null | EXT_ONREQUEST |
| :white_check_mark: | warning | Web extension | Deprecated API app.getDetails | | | null | APP_GETDETAILS |
| :white_check_mark: | warning | Web extension | Temporary IDs can cause issues with storage.local | | | null | STORAGE_LOCAL |
| :white_check_mark: | warning | Web extension | Temporary IDs can cause issues with storage.sync | | | null | STORAGE_SYNC |
| :white_check_mark: | warning | Web extension | Temporary IDs can cause issues with identity.getRedirectURL | | | null | IDENTITY_GETREDIRECTURL |
| :white_check_mark: | warning | Web extension | When default_locale is specified a matching messages.json must exist | | | null | NO_MESSAGES_FILE |
| :white_check_mark: | warning | Web extension | When _locales directory exists, default_locale must exist | | | null | NO_DEFAULT_LOCALE |
| :white_check_mark: | warning | Web extension | | | | | UNSAFE_VAR_ASSIGNMENT |
| :white_check_mark: | warning | Web extension | Unsupported or unknown browser API | | | null | UNSUPPORTED_API |
| :white_check_mark: | warning | Web extension | | | | | DANGEROUS_EVAL |
