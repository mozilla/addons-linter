import { ESLINT_ERROR, ESLINT_WARNING } from 'const';

export const ESLintRuleMapping = {
  banned_identifiers: ESLINT_WARNING,
  eval_string_arg: ESLINT_ERROR,
  global_require_arg: ESLINT_WARNING,
  low_level_module: ESLINT_WARNING,
  mozindexeddb: ESLINT_ERROR,
  mozindexeddb_property: ESLINT_WARNING,
  only_prefs_in_defaults: ESLINT_WARNING,
  opendialog_nonlit_uri: ESLINT_WARNING,
  opendialog_remote_uri: ESLINT_WARNING,
  shallow_wrapper: ESLINT_WARNING,
  widget_module: ESLINT_WARNING,
};

export * from './banned_identifiers';
export * from './eval_string_arg';
export * from './global_require_arg';
export * from './low_level_module';
export * from './mozindexeddb';
export * from './mozindexeddb_property';
export * from './only_prefs_in_defaults';
export * from './opendialog_nonlit_uri';
export * from './opendialog_remote_uri';
export * from './shallow_wrapper';
export * from './widget_module';
