// We are using commonjs style imports here to avoid the need to import
// and correctly export again so that it's only one line to add.
/* eslint-disable global-require */

module.exports = {
  rules: {
    'deprecated-entities': require('./deprecated-entities').default,
    'event-listener-fourth': require('./event-listener-fourth').default,
    'global-require-arg': require('./global-require-arg').default,
    mozindexeddb: require('./mozindexeddb').default,
    'mozindexeddb-property': require('./mozindexeddb-property').default,
    'opendialog-nonlit-uri': require('./opendialog-nonlit-uri').default,
    'opendialog-remote-uri': require('./opendialog-remote-uri').default,
    'webextension-api': require('./webextension-api').default,
    'webextension-unsupported-api':
      require('./webextension-unsupported-api').default,
  },
};
