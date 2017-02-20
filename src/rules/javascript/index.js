import banned_identifiers from './banned-identifiers';
import deprecated_entities from './deprecated-entities';
import eval_string_arg from './eval-string-arg';
import event_listener_fourth from './event-listener-fourth';
import global_require_arg from './global-require-arg';
import init_null_arg from './init-null-arg';
import low_level_module from './low-level-module';
import mozindexeddb from './mozindexeddb';
import mozindexeddb_property from './mozindexeddb-property';
import only_prefs_in_defaults from './only-prefs-in-defaults';
import opendialog_nonlit_uri from './opendialog-nonlit-uri';
import opendialog_remote_uri from './opendialog-remote-uri';
import shallow_wrapper from './shallow-wrapper';
import webextension_api from './webextension-api';
import widget_module from './widget-module';


export default {
  rules: {
    'banned-identifiers': banned_identifiers,
    'deprecated-entities': deprecated_entities,
    'eval-string-arg': eval_string_arg,
    'event-listener-fourth': event_listener_fourth,
    'global-require-arg': global_require_arg,
    'init-null-arg': init_null_arg,
    'low-level-module': low_level_module,
    'mozindexeddb': mozindexeddb,
    'mozindexeddb-property': mozindexeddb_property,
    'only-prefs-in-defaults': only_prefs_in_defaults,
    'opendialog-nonlit-uri': opendialog_nonlit_uri,
    'opendialog-remote-uri': opendialog_remote_uri,
    'shallow-wrapper': shallow_wrapper,
    'webextension-api': webextension_api,
    'widget-module': widget_module,
  },
};
