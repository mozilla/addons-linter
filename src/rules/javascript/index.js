// We are using commonjs style imports here to avoid the need to import
// and correctly export again so that it's only one line to add.
/* eslint-disable global-require */

module.exports = {
  rules: {
    'deprecated-entities': require('./deprecated-entities').default,
    'event-listener-fourth': require('./event-listener-fourth').default,
    'global-require-arg': require('./global-require-arg').default,
    'opendialog-nonlit-uri': require('./opendialog-nonlit-uri').default,
    'opendialog-remote-uri': require('./opendialog-remote-uri').default,
    'webextension-api': require('./webextension-api').default,
    'content-scripts-file-absent': require('./content-scripts-file-absent')
      .default,
    'webextension-unsupported-api': require('./webextension-unsupported-api')
      .default,
    'webextension-deprecated-api': require('./webextension-deprecated-api')
      .default,
    'webextension-api-compat': require('./webextension-api-compat').default,
    'webextension-api-compat-android': require('./webextension-api-compat-android')
      .default,
  },
};
