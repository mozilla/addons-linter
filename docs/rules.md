
# Validator Rules

We should try and list out all the validation rules we know of by file type. E.g. .js, .rdf, .manifest etc.

## JavaScript

### Actions

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | dangerous_contract | | Dangerous XPCOM contract ID |  | [testcases/javascript/actions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/actions.py)|
| :x: | banned_identifier | | Banned or deprecated JavaScript Identifier | | | | |
| :x: | complex_prefs_defaults_code | | Complex code should not appear in preference defaults files | | | | |
| :x: | called_dangerous_global | | `%s` called in potentially dangerous manner' | | | | |
| :x: | eval | | In order to prevent vulnerabilities, the `setTimeout` 'and `setInterval` functions should be called only with function expressions as their first argument. | | | | |
| :x: | low_level_module (not from src) | | Usage of low-level or non-SDK interface | | | | |
| :x: | widget | | Use of deprecated SDK module | | | | |
| :x: | \_readonly_top | | window.top is a reserved variable | | | | |
| :x: | global_overwrite | | Global variable overwrite | | | | |


### Call definitions
| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | webbrowserpersist | | nsIWebBrowserPersist should no longer be used |  | [testcases/javascript/call_definitions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/call_definitions.py)| | |
| :x: | webbrowserpersist_saveuri | | saveURI should not be called with a null load context | | | | |
| :x: | deprec | | Deprecated nsIJSON methods in use | | | | |
| :x: | shallow | | Shallow XPCOM wrappers should not be used | | | | |
| :x: | %s_nonliteral | | `%s` called with non-literal parameter. | | | | |
| :x: | %s_remote_uri | | `%s` called with non-local URI. | | | | |

###  Entity values

*Deprecated entities are checked with a generated set of rules*

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | deprecated_entity | | THIS IS A GENERATED ERROR |  | [testcases/javascript/entity_values.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/entity_values.py)| | |
| :x: | evil | | Use of `document.write` strongly discouraged. | | | | |
| :x: | nsIDNSServiceResolve | | `nsIDNSService.resolve()` should not be used. | | | | |
| :x: | nsISound_play | | `nsISound.play` should not be used | | | | |
| :x: | init | | `init` should not be called with a null first argument | | | | |
| :x: | override | | Extensions must not alter user preferences such as the new tab URL without explicit user consent.  | | | | |

### instanceactions

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | addEventListener_fourth | | `addEventListener` called with truthy fourth argument |  | [testcases/javascript/instanceactions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceactions.py)| | |
| :x: | called_createelement | | createElement() used to create script tag | | | | |
| :x: | createelement_variable | | Variable element type being created | | | | |
| :x: | setting_on\*  | | on\* attribute being set using setAttribute | | | | |
| :x: | launch | | Potentially dangerous use of `launch()` | | | | |
| :x: | executeSimpleSQL_dynamic | | SQL statements should be static strings | | | | |
| :x: | executeSimpleSQL | | Synchronous SQL should not be used | | | | |
| :x: | called_set_preference | | Attempt to set a dangerous preference | | | | |


### instanceproperties

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | event_assignment | | Event handler assignment via %s |  | [testcases/javascript/instanceproperties.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceproperties.py)| | |
| :x: | script_assignment | | Scripts should not be created with `%s` | | | | |
| :x: | variable_assignment | | Markup should not be passed to `%s` dynamically. | | | | |
| :x: | on\*_str_assignment | | on\* property being assigned string | | | | |
| :x: | handleEvent | | `handleEvent` no longer implemented in Gecko 18 | | | | |
| :x: | \_\_proto\_\_ | | Using `__proto__` or `setPrototypeOf` to set a prototype is now deprecated | | | | |
| :x: | \_\_exposedProps\_\_ | | Use of deprecated `__exposedProps__` declaration | | | | |
| :x: | set_non_literal | | `contentScript` properties should not be used | | | | |

### jsshell

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | syntax_error | | JavaScript Compile-Time Error |  | [testcases/javascript/jsshell.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jsshell.py)| | JS_SYNTAX_ERROR |
| :x: | recursion_error | | JS too deeply nested for validation | | | | |
| :x: | retrieving_tree | | JS reflection error prevented validation | | | | |

### jstypes

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | unwrapped_js_object | | Assignment of unwrapped JS Object's properties |  | [testcases/javascript/jstypes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jstypes.py)| | |
| :x: | const_overwrite | | Overwritten constant value | | | | |
| :x: | global_overwrite | | Global overwrite. An attempt to overwrite a global variable was made in some JS code | | | | |
| :x: | global_member_deletion | | Members of global object may not be deleted | | | | |
| :x: | jetpack_abs_uri |  | Absolute URIs in Jetpack 1.4 are disallowed | | | | |

### predefinedentities

*this file appear to contain lot of data but looks to be used elsewhere a second pass would be good to check*

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | dangerous_global | | The FUEL library is now deprecated |  | [testcases/javascript/predefinedentities.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/predefinedentities.py)| | |
| :x: | changes (search_service) | | Potentially dangerous use of the search service | | | |  |
| :x: | write (windows_registry) | | Writes to the registry may be dangerous | | | | |

### Traverser

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | namespace_pollution | | JavaScript namespace pollution |  | [testcases/javascript/traverser.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/traverser.py)| | |
| :x: | dangerous_global | | Access to the `%s` property is deprecated for security or other reasons. | | | | |


## Markup

### CSS

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | -moz-binding_external | | Illegal reference to external scripts |  | [testcases/markup/csstester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/csstester.py)| | MOZ_BINDING_EXT_REFERENCE |
| :x: | remote_url | | Themes may not reference remote resources | | | | |
| :x: | identity_box | | Modification to identity box | | | | |
| :x: | unicode_decode | | Unicode decode error. | | | | |
| :white_check_mark: | CSS syntax error | A CSS syntax error was detected | | N/A | N/A | CSS_SYNTAX_ERROR |

### HTML

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | parse_error | | There was an error parsing a markup file |  | [testcases/markup/markuptester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/markuptester.py)| | |
| :x: | banned_element | | A banned markup element was found | | | | |
| :x: | unsafe_theme_xbl_element | theme | Certain XBL elements are disallowed in full themes | | | | |
| :x: | theme_xbl_property | theme | Themes are not allowed to use XBL properties | | | | |
| :x: | unsafe_langpack_theme | theme / langpack | Unsafe tag for add-on type | | | | |
| :x: | remote_src_href | theme / langpack | `src`/`href` attributes must be local | | | | |
| :white_check_mark: | prefwindow_id | | `<prefwindow>` elements must have IDs | | | | PREFWINDOW_REQUIRES_ID |
| :x: | iframe_type_unsafe | | iframe/browser missing 'type' attribute | | | | |
| :x: | iframe_type_unsafe | | Typeless iframes/browsers must be local | | | | |
| :x: | banned_remote_scripts | | Scripts must not be remote | | | | |
| :x: | jetpack_abs_uri | | Absolute URI referenced in Jetpack 1.4 | | | | |
| :x: | theme_attr_prefix | theme | Attribute contains banned prefix | | | | |
| :x: | dom_manipulation_handler | | DOM Mutation Events Prohibited | | | | |
| :x: | generic_ids | | Overlay contains generically-named IDs | | | | |
| :x: | complex_script | | Long inline script | | | | |
| :x: | extra_closing_tags | | Markup parsing error | | | | |
| :x: | extra_closing_tags | | Parse error: tag closed before opened | | | | |
| :x: | invalid_nesting | | Markup invalidly nested | | | | |


## chrome.manifest

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | resource_modules | | Potentially dangerous category entry |  chrome.manifest | [testcases/chromemanifest.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/chromemanifest.py)| 'resource_modules') | DANGEROUS_CATEGORY |
| :x: | resource_modules | | Resources should not be packages in the 'modules' namespace | chrome.manifest | | | |
| :x: | missing_triplicates | | `content` instruction missing information | chrome.manifest | | | |
| :x: | trailing | | Content instruction URIs must end with trailing slash | chrome.manifest | | | |


## Content

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | found_in_chrome_manifest| | xpcnativewrappers not allowed in chrome.manifest |  chrome.manifest | [testcases/content.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/content.py)| | |
| :x: | hidden_files | | Hidden files and folders flagged | | | | |
| :x: | flagged_files | | Flagged filename found | | | | |
| :x: | blacklisted_js_library | | JS Library Detected | | | | |
| :x: | invalid_chrome_url | | Invalid chrome URL | | | | |
| :x: | too_much_js | | TOO MUCH JS FOR EXHAUSTIVE VALIDATION | | | | |
| :x: | signed_xpi | | Package already signed | | | | |
| :x: | jar_subpackage_corrupt  | | Subpackage corrupt | | | | |


## Install.rdf

TODO: Alot of these are generated so this will need expanded with each unique code.

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_HIDDEN |
| :white_check_mark: | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_UPDATEKEY |
| :white_check_mark: | shouldnt_exist | | Banned element in install.rdf | install.rdf | [96](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py) | ('testcases_installrdf', '_test_rdf', 'shouldnt_exist') | TAG_NOT_ALLOWED_UPDATEURL |
| :white_check_mark: | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_FILE |
| :white_check_mark: | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_REQUIRES |
| :white_check_mark: | obsolete | | Obsolete element in install.rdf | install.rdf | | | TAG_OBSOLETE_SKIN |
| :x: | optionsType | | <em:optionsType> has bad value. | install.rdf | | | |
| :x: | unrecognized | | Unrecognized element in install.rdf | install.rdf | | | |
| :x: | missing_updateKey | | Missing updateKey element | install.rdf | | | |
| :x: | Missing updateURL element | | Missing updateURL element | install.rdf | | | |
| :x: | missing_addon | | install.rdf missing element(s). | install.rdf | | | |




## Jetpack

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | mismatched_version | | Jetpack module version mismatch |  | [testcases/jetpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/jetpack.py) | | |
| :x: | extra_hashes | | Extra hashes registered in harness-options | harness-options.json | | | |
| :x: | bad_harness-options.json | | harness-options.json is not decodable JSON | harness-options.json | | | |
| :x: | harness-options_missing_elements | | Elements are missing from harness-options.json | harness-options.json | | | |
| :x: | redacted_version | | Unsupported version of Add-on SDK | | | | |
| :x: | outdated_version | | Outdated version of Add-on SDK | | | | |
| :x: | future_version | | Future version of Add-on SDK unrecognized | | | | |
| :x: | irregular_module_location | | Irregular Jetpack module location | harness-options.json | | | |
| :x: | irregular_module_elements | | Irregular Jetpack module elements | harness-options.json | | | |
| :x: | missing_jetpack_module | | Missing Jetpack module | harness-options.json | | | |
| :x: | mismatched_checksum | | Jetpack module hash mismatch | | | | |


## l10ncompleteness

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | manager_absent | | Listed locale does not exist   | chrome.manifest | [testcases/l10ncompleteness.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/l10ncompleteness.py) | | |
| :x: | no_locales | | Add-on appears not to be localized | chrome.manifest | | | |
| :x: | missing_app_support |  | Supported app missing in localization completeness | | | | |
| :x: | find_corresponding_locale | | Could not find corresponding locale | chrome.manifest | | | |
| :x: | missing_file | | Missing translation file | | | | |
| :x: | missing_translation_entity | | Missing translation entity |   | | | |
| :x: | unchanged_entities | | Unchanged translation entities | | | | |
| :x: | unexpected_encodings | | Unexpected encodings in locale files | | | | |


## langpacks

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | invalid_subject | | Invalid chrome.manifest subject. chrome.manifest files in language packs are only allowed to contain items that are prefixed with 'locale', 'manifest', or 'override' | chrome.manifest | [testcases/langpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/langpack.py) | | |
| :x: | invalid_override | | Invalid chrome.manifest object/predicate. | chrome://\*/locale/\* | | | |
| :x: | unsafe_content_html | | Unsafe HTML found in language pack files | | | | |
| :x: | unsafe_content_link | | Unsafe remote resource found in language pack | | | | |


## package.json

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | field_required | | Your package.json is missing a required field | | [testcases/packagejson.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagejson.py) | | |


## Package layout

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | deprecated_file | |  Extension contains a deprecated file | | [testcases/packagelayout.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py) | | |
| :x: | disallowed_file_type | | Flagged file type found | | | | |
| :x: | java_jar | | Java JAR file detected | | | | |
| :x: | disallowed_extension | | Flagged file extensions found | | | | |
| :x: | test_godlikea | | Banned 'godlikea' chrome namespace | | | | |
| :x: | disallowed_file_type | | (Binary) Flagged file type found | | | | |
| :x: | missing_install_rdf | | Add-on missing install.rdf | | | | |
| :white_check_mark: | duplicate_entries | | Package contains duplicate entries | | | | DUPLICATE_XPI_ENTRY |
| :x: | should_be_true | | Add-on should set <em:unpack> to true | | | | |
| :x: | should_be_false | | Add-on contains JAR files, no <em:unpack> | | | | |
| :x: | unknown_file | | Unknown file found in add-on | | | | |
| :x: | missing_required | | Required file missing | | | | |

## Type detection

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :white_check_mark: | missing_install_rdf | | Add-on missing install.rdf for type detection | | [22](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L22) | ('typedetection', 'detect_type', 'missing_install_rdf') | TYPE_NO_INSTALL_RDF |
| :white_check_mark: | invalid_em_type | | The only valid values for <em:type> are 2, 4, 8, and 32 | | [46](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L46) | ('typedetection', 'detect_type', 'invalid_em_type') | TYPE_INVALID |
| :white_check_mark: | no_em:type | | No <em:type> element found in install.rdf | | [66](https://github.com/mozilla/amo-validator/blob/master/validator/typedetection.py#L66) | ('typedetection', 'detect_type', 'no_em:type') | TYPE_MISSING |
| :white_check_mark: | undeterminable_type | | Unable to determine add-on type | | [195](https://github.com/mozilla/amo-validator/blob/master/validator/submain.py#L195) | ('main', 'test_package', 'undeterminable_type') | TYPE_NOT_DETERMINED |


## Themes

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | invalid_chrome_manifest_subject | theme | chrome.manifest files for full themes are only allowed to have 'skin' and 'style' items. Other types of items are disallowed for security reasons.' | chrome.manifest | [testcases/themes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) | | |
| :x: | theme_js | theme | Themes should not contain executable code. | \*.js | [testcases/scripting.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) | | |


## Target Versions

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | invalid_min_version | addon? |  The minimum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | [testcases/targetapplication.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/targetapplication.py) | | |
| :x: | invalid_max_version | addon? |  The maximum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | | | |
| :x: | invalid_version_order | addon? | The version numbers provided for the application in question are not in the correct order. The maximum version must be greater than the minimum version.' | install.rdf | | | |
| :x: | missing_minversion | addon? | Missing minVersion property. A targetApplication element is missing its minVersion property. This may cause it to be ignored as invalid. | install.rdf | | | |
| :x: | missing_maxversion | addon? | Missing maxVersion property. A targetApplication element is missing its maxVersion property. This may cause it to be ignored as invalid. | install.rdf | | | |
| :x: | duplicate_targetapps | addon? | Found duplicate <em:targetApplication> elements. Multiple targetApplication elements were found in the install.manifest file that refer to the same application GUID. There should not be duplicate target applications entries. | install.rdf | | | |
| :x: | no_mozilla_support | addon? | None of the target applications listed in                     'install.rdf are supported Mozilla products. At least one official Mozilla product must be supported for inclusion on addons.mozilla.org. See [appversions](https://addons.mozilla.org/firefox/pages/appversions/) for more information on supported target applications on AMO.' | install.rdf | | | |

## Regex Tests

*Note the rule names for these do not come from the code*

| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | invalid_sync_services_object_reuse |   | Sync services objects are not intended to be re-used |  | [testcases/regex.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/regex.py) | | |
| :x: | warn_mouse_events |   | Mouse events may cause performance issues |  |  | | |
| :x: | dom_mutation_events_disallowed |  | DOM mutation event use prohibited |  | | | |
| :x: | new_tab_override |  |  Possible attempt to override new tab page |  | | | |
| :x: | unsafe_template_escape |  | Potentially unsafe template escape sequence | | | | |
| :x: | js_protoype_extension_dissallowed |  | JS prototype extension not allowed  | | | | |
| :white_check_mark: | mozindexdb_removed |  | mozIndexedDB has been removed |  | | | MOZINDEXEDDB |
| :white_check_mark: | mozIndexedDB property not allowed |  | mozIndexedDB has been removed |  | N/A | N/A | MOZINDEXEDDB_PROPERTY |
| :x: | composition_features_removed |  | nsICompositionStringSynthesizer, sendCompositionEvent and createCompositionStringSynthesizer were removed | | | | |
| :x: | asyncfetch2_newchannel2_deprecated |  | asyncFetch2 and newChannel2 are now deprecated | | | | |
| :x: | onproxyavailable_asyncresolve_changed |  | The onProxyAvailable and asyncResolve functions have changed |  | | | |
| :x: | noSuchMethod_deprecated |  | The \_\_noSuchMethod__ property has been deprecated |  | | | |
| :x: | sendAsBinary_removed |  | The function sendAsBinary() in XMLHttpRequest has been removed |  | | | |
| :x: | theme_prefs_changed | | The preferences used to store theme selection have changed |  | | | |
| :x: | old_keywords_api_deprecated | | The old keywords API is deprecated | | | | |
| :x: | fuel_library_deprecated | | The FUEL library is now deprecated | | | | |
| :x: | dictjsm_removed | | The Dict.jsm module has been removed | | | | |
| :x: | sessionstore_state_write_removed | | The sessionstore-state-write notification has been removed. | | | | |
| :x: | nsISSLErrorListener_removed | | The nsISSLErrorListener interface has been removed |  | | | |
| :x: | widget_module_removed | | The widget module has been removed | | | | |
| :x: | user_profile_data_reference | | Reference to critical user profile data | | | | |
| :x: | em_action_requested | | Obsolete Extension Manager API | | | | |
| :x: | unsafe_pref_branch_ref | | Potentially unsafe preference branch  referenced (x2) | | | | |
| :x: | browsernewtaburl_pref_removed |  |  The browser.newtab.url preference has been removed | | | | |
| :x: | password_stored_in_prefs | | Passwords should not be stored in preferences | | | | |

## Thunderbird Regex Tests

*Note the rule names for these do not come from the code*


| Done? | Rule name | Addon type | Description | File Type | Source ref | Old Code | New Code |
| ----- | --------- | ---------- | ----------- | --------- | ---------- | -------- | -------- |
| :x: | removed_labels_in_use |  | Removed labels in use (Repeated for multiple versions) | | | | |
