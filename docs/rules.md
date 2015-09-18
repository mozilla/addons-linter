
# Validator Rules

We should try and list out all the validation rules we know of by file type. E.g. .js, .rdf, .manifest etc.

## JavaScript

### Actions

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| dangerous_contract | | Dangerous XPCOM contract ID |  | [testcases/javascript/actions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/actions.py)|
| banned_identifier | | Banned or deprecated JavaScript Identifier | | |
| complex_prefs_defaults_code | | Complex code should not appear in preference defaults files | | |
| called_dangerous_global | | `%s` called in potentially dangerous manner' | | |
| eval | | In order to prevent vulnerabilities, the `setTimeout` 'and `setInterval` functions should be called only with function expressions as their first argument. | | |
| low_level_module (not from src) | | Usage of low-level or non-SDK interface | | |
| widget | | Use of deprecated SDK module | | |
| \_readonly_top | | window.top is a reserved variable | | |
| global_overwrite | | Global variable overwrite | | |


### Call definitions

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| webbrowserpersist | | nsIWebBrowserPersist should no longer be used |  | [testcases/javascript/call_definitions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/call_definitions.py)|
| webbrowserpersist_saveuri | | saveURI should not be called with a null load context | | |
| deprec | | Deprecated nsIJSON methods in use | | |
| shallow | | Shallow XPCOM wrappers should not be used | | |
| %s_nonliteral | | `%s` called with non-literal parameter. | | |
| %s_remote_uri | | `%s` called with non-local URI. | | |

###  Entity values

*Deprecated entities are checked with a generated set of rules*

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| deprecated_entity | | THIS IS A GENERATED ERROR |  | [testcases/javascript/entity_values.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/entity_values.py)|
| evil | | Use of `document.write` strongly discouraged. | | |
| nsIDNSServiceResolve | | `nsIDNSService.resolve()` should not be used. | | |
| nsISound_play | | `nsISound.play` should not be used | | |
| init | | `init` should not be called with a null first argument | | |
| override | | Extensions must not alter user preferences such as the new tab URL without explicit user consent.  | | |

### instanceactions

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| addEventListener_fourth | | `addEventListener` called with truthy fourth argument |  | [testcases/javascript/instanceactions.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceactions.py)|
| called_createelement | | createElement() used to create script tag | | |
| createelement_variable | | Variable element type being created | | |
| setting_on\*  | | on\* attribute being set using setAttribute | | |
| launch | | Potentially dangerous use of `launch()` | | |
| executeSimpleSQL_dynamic | | SQL statements should be static strings | | |
| executeSimpleSQL | | Synchronous SQL should not be used | | |
| called_set_preference | | Attempt to set a dangerous preference | | |


### instanceproperties

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| event_assignment | | Event handler assignment via %s |  | [testcases/javascript/instanceproperties.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/instanceproperties.py)|
| script_assignment | | Scripts should not be created with `%s` | | |
| variable_assignment | | Markup should not be passed to `%s` dynamically. | | |
| on\*_str_assignment | | on\* property being assigned string | | |
| handleEvent | | `handleEvent` no longer implemented in Gecko 18 | | |
| \_\_proto\_\_ | | Using `__proto__` or `setPrototypeOf` to set a prototype is now deprecated | | |
| \_\_exposedProps\_\_ | | Use of deprecated `__exposedProps__` declaration | | |
| set_non_literal | | `contentScript` properties should not be used | | |

### jsshell

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| syntax_error | | JavaScript Compile-Time Error |  | [testcases/javascript/jsshell.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jsshell.py)|
| recursion_error | | JS too deeply nested for validation | | |
| retrieving_tree | | JS reflection error prevented validation | | |

### jstypes

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| unwrapped_js_object | | Assignment of unwrapped JS Object's properties |  | [testcases/javascript/jstypes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/jstypes.py)|
| const_overwrite | | Overwritten constant value | | |
| global_overwrite | | Global overwrite. An attempt to overwrite a global variable was made in some JS code | | |
| global_member_deletion | | Members of global object may not be deleted | | |
| jetpack_abs_uri |  | Absolute URIs in Jetpack 1.4 are disallowed | | |

### predefinedentities

*this file appear to contain lot of data but looks to be used elsewhere a second pass would be good to check*

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| dangerous_global | | The FUEL library is now deprecated |  | [testcases/javascript/predefinedentities.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/predefinedentities.py)|
| changes (search_service) | | Potentially dangerous use of the search service | | |
| write (windows_registry) | | Writes to the registry may be dangerous | | |

### Traverser

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| namespace_pollution | | JavaScript namespace pollution |  | [testcases/javascript/traverser.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/javascript/traverser.py)|
| dangerous_global | | Access to the `%s` property is deprecated for security or other reasons. | | |


## Markup

### CSS

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| -moz-binding_external | | Illegal reference to external scripts |  | [testcases/markup/csstester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/csstester.py)|
| remote_url | | Themes may not reference remote resources | | |
| identity_box | | Modification to identity box | | |
| unicode_decode | | Unicode decode error. | | |

### HTML

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| parse_error | | There was an error parsing a markup file |  | [testcases/markup/markuptester.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/markup/markuptester.py)|
| banned_element | | A banned markup element was found | | |
| unsafe_theme_xbl_element | theme | Certain XBL elements are disallowed in full themes | | |
| theme_xbl_property | theme | Themes are not allowed to use XBL properties | | |
| unsafe_langpack_theme | theme / langpack | Unsafe tag for add-on type | | |
| remote_src_href | theme / langpack | `src`/`href` attributes must be local | | |
| prefwindow_id | | `<prefwindow>` elements must have IDs | | |
| iframe_type_unsafe | | iframe/browser missing 'type' attribute | | |
| iframe_type_unsafe | | Typeless iframes/browsers must be local | | |
| banned_remote_scripts | | Scripts must not be remote | | |
| jetpack_abs_uri | | Absolute URI referenced in Jetpack 1.4 | | |
| theme_attr_prefix | theme | Attribute contains banned prefix | | |
| dom_manipulation_handler | | DOM Mutation Events Prohibited | | |
| generic_ids | | Overlay contains generically-named IDs | | |
| complex_script | | Long inline script | | |
| extra_closing_tags | | Markup parsing error | | |
| extra_closing_tags | | Parse error: tag closed before opened | | |
| invalid_nesting | | Markup invalidly nested | | |


## chrome.manifest

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| resource_modules | | Potentially dangerous category entry |  chrome.manifest | [testcases/chromemanifest.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/chromemanifest.py)|
| resource_modules | | Resources should not be packages in the 'modules' namespace | chrome.manifest | |
| missing_triplicates | | `content` instruction missing information | chrome.manifest | |
| trailing | | Content instruction URIs must end with trailing slash | chrome.manifest | |


## Content

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| found_in_chrome_manifest| | xpcnativewrappers not allowed in chrome.manifest |  chrome.manifest | [testcases/content.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/content.py)|
| hidden_files | | Hidden files and folders flagged | | |
| flagged_files | | Flagged filename found | | |
| blacklisted_js_library | | JS Library Detected | | |
| invalid_chrome_url | | Invalid chrome URL | | |
| too_much_js | | TOO MUCH JS FOR EXHAUSTIVE VALIDATION | | |
| signed_xpi | | Package already signed | | |
| jar_subpackage_corrupt  | | Subpackage corrupt | | |


## Install.rdf

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| shouldnt_exist | | Banned element in install.rdf | install.rdf | [testcases/installrdf.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/installrdf.py)|
| obsolete | | Obsolete element in install.rdf | install.rdf | |
| optionsType | | <em:optionsType> has bad value. | install.rdf | |
| unrecognized | | Unrecognized element in install.rdf | install.rdf | |
| missing_updateKey | | Missing updateKey element | install.rdf | |
| Missing updateURL element | | Missing updateURL element | install.rdf | |
| missing_addon | | install.rdf missing element(s). | install.rdf | |


## Jetpack

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| mismatched_version | | Jetpack module version mismatch |  | [testcases/jetpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/jetpack.py) |
| extra_hashes | | Extra hashes registered in harness-options | harness-options.json | |
| bad_harness-options.json | | harness-options.json is not decodable JSON | harness-options.json | |
| harness-options_missing_elements | | Elements are missing from harness-options.json | harness-options.json | |
| redacted_version | | Unsupported version of Add-on SDK | | |
| outdated_version | | Outdated version of Add-on SDK | | |
| future_version | | Future version of Add-on SDK unrecognized | | |
| irregular_module_location | | Irregular Jetpack module location | harness-options.json | |
| irregular_module_elements | | Irregular Jetpack module elements | harness-options.json | |
| missing_jetpack_module | | Missing Jetpack module | harness-options.json | |
| mismatched_checksum | | Jetpack module hash mismatch | | |


## l10ncompleteness

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| manager_absent | | Listed locale does not exist   | chrome.manifest | [testcases/l10ncompleteness.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/l10ncompleteness.py) |
| no_locales | | Add-on appears not to be localized | chrome.manifest | |
| missing_app_support |  | Supported app missing in localization completeness | | |
| find_corresponding_locale | | Could not find corresponding locale | chrome.manifest | |
| missing_file | | Missing translation file | | |
| missing_translation_entity | | Missing translation entity |   | |
| unchanged_entities | | Unchanged translation entities | | |
| unexpected_encodings | | Unexpected encodings in locale files | | |


## langpacks

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| invalid_subject | | Invalid chrome.manifest subject. chrome.manifest files in language packs are only allowed to contain items that are prefixed with 'locale', 'manifest', or 'override' | chrome.manifest | [testcases/langpack.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/langpack.py) |
| invalid_override | | Invalid chrome.manifest object/predicate. | chrome://\*/locale/\* | |
| unsafe_content_html | | Unsafe HTML found in language pack files | | |
| unsafe_content_link | | Unsafe remote resource found in language pack | | |


## package.json

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| field_required | | Your package.json is missing a required field | | [testcases/packagejson.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagejson.py) |


## Package layout


| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| deprecated_file | |  Extension contains a deprecated file | | [testcases/packagelayout.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/packagelayout.py) |
| disallowed_file_type | | Flagged file type found | | |
| java_jar | | Java JAR file detected | | |
| disallowed_extension | | Flagged file extensions found | | |
| test_godlikea | | Banned 'godlikea' chrome namespace | | |
| disallowed_file_type | | (Binary) Flagged file type found | | |
| missing_install_rdf | | Add-on missing install.rdf | | |
| duplicate_entries | | Package contains duplicate entries | | |
| should_be_true | | Add-on should set <em:unpack> to true | | |
| should_be_false | | Add-on contains JAR files, no <em:unpack> | | |
| unknown_file | | Unknown file found in add-on | | |
| missing_required | | Required file missing | | |

## Themes

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| invalid_chrome_manifest_subject | theme | chrome.manifest files for full themes are only allowed to have 'skin' and 'style' items. Other types of items are disallowed for security reasons.' | chrome.manifest | [testcases/themes.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) |
| theme_js | theme | Themes should not contain executable code. | \*.js | [testcases/scripting.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/themes.py) |


## Target Versions

| Rule name | Addon type | Description | File Type | Source ref |
| --------- | ---------- | ----------- | --------- | ---------- |
| invalid_min_version | addon? |  The minimum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | [testcases/targetapplication.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/targetapplication.py) |
| invalid_max_version | addon? |  The maximum version that was specified is not an acceptable version number for the Mozilla product that it corresponds with. | install.rdf | |
| invalid_version_order | addon? | The version numbers provided for the application in question are not in the correct order. The maximum version must be greater than the minimum version.' | install.rdf | |
| missing_minversion | addon? | Missing minVersion property. A targetApplication element is missing its minVersion property. This may cause it to be ignored as invalid. | install.rdf | |
| missing_maxversion | addon? | Missing maxVersion property. A targetApplication element is missing its maxVersion property. This may cause it to be ignored as invalid. | install.rdf | |
| duplicate_targetapps | addon? | Found duplicate <em:targetApplication> elements. Multiple targetApplication elements were found in the install.manifest file that refer to the same application GUID. There should not be duplicate target applications entries. | install.rdf | |
| no_mozilla_support | addon? | None of the target applications listed in                     'install.rdf are supported Mozilla products. At least one official Mozilla product must be supported for inclusion on addons.mozilla.org. See [appversions](https://addons.mozilla.org/firefox/pages/appversions/) for more information on supported target applications on AMO.' | install.rdf | |

## Regex Tests

*Note the rule names for these do not come from the code*

| Rule name |  Addon type | Description | File Type | Source ref |
| --------- |  ---------- | ----------- | --------- | ---------- |
| invalid_sync_services_object_reuse |   | Sync services objects are not intended to be re-used |  | [testcases/regex.py](https://github.com/mozilla/amo-validator/blob/master/validator/testcases/regex.py) |
| warn_moust_events |   | Mouse events may cause performance issues |  |  |
| dom_mutation_events_disallowed |  | DOM mutation event use prohibited |  | |
| new_tab_override |  |  Possible attempt to override new tab page |  | |
| unsafe_template_escape |  | Potentially unsafe template escape sequence |  |  |
| js_protoype_extension_dissallowed |  | JS prototype extension not allowed  |  | |
| mozindexdb_removed |  | mozIndexedDB has been removed |  | |
| composition_features_removed |  | nsICompositionStringSynthesizer, sendCompositionEvent and createCompositionStringSynthesizer were removed |  | |
| asyncfetch2_newchannel2_deprecated |  | asyncFetch2 and newChannel2 are now deprecated |  | |
| onproxyavailable_asyncresolve_changed |  | The onProxyAvailable and asyncResolve functions have changed |  | |
| noSuchMethod_deprecated |  | The \_\_noSuchMethod__ property has been deprecated |  | |
| sendAsBinary_removed |  | The function sendAsBinary() in XMLHttpRequest has been removed |  | |
| theme_prefs_changed | | The preferences used to store theme selection have changed |  | |
| old_keywords_api_deprecated | | The old keywords API is deprecated | | |
| fuel_library_deprecated | | The FUEL library is now deprecated | | |
| dictjsm_removed | | The Dict.jsm module has been removed | | |
| sessionstore_state_write_removed | | The sessionstore-state-write notification has been removed. | | |
| nsISSLErrorListener_removed | | The nsISSLErrorListener interface has been removed |  | |
| widget_module_removed | | The widget module has been removed | | |
| user_profile_data_reference | | Reference to critical user profile data | | |
| em_action_requested | | Obsolete Extension Manager API | | |
| unsafe_pref_branch_ref | | Potentially unsafe preference branch referenced (x2) |  | |
| browsernewtaburl_pref_removed |  |  The browser.newtab.url preference has been removed |  | |
| password_stored_in_prefs | | Passwords should not be stored in preferences | | |

## Thunderbird Regex Tests

*Note the rule names for these do not come from the code*


| Rule name |  Addon type | Description | File Type | Source ref |
| --------- |  ---------- | ----------- | --------- | ---------- |
| removed_labels_in_use |  | Removed labels in use (Repeated for multiple versions) | | |

