// We are using commonjs style imports here to avoid the need to import
// and correctly export again so that it's only one line to add.

module.exports = {
  rules: {
    'banned-identifiers': require('./banned-identifiers').default,
    'deprecated-entities': require('./deprecated-entities').default,
    'eval-string-arg': require('./eval-string-arg').default,
    'event-listener-fourth': require('./event-listener-fourth').default,
    'global-require-arg': require('./global-require-arg').default,
    'init-null-arg': require('./init-null-arg').default,
    'low-level-module': require('./low-level-module').default,
    'mozindexeddb': require('./mozindexeddb').default,
    'mozindexeddb-property': require('./mozindexeddb-property').default,
    'only-prefs-in-defaults': require('./only-prefs-in-defaults').default,
    'opendialog-nonlit-uri': require('./opendialog-nonlit-uri').default,
    'opendialog-remote-uri': require('./opendialog-remote-uri').default,
    'shallow-wrapper': require('./shallow-wrapper').default,
    'webextension-api': require('./webextension-api').default,
    'webextension-unsupported-api':
      require('./webextension-unsupported-api').default,
    'widget-module': require('./widget-module').default,
  },
};
