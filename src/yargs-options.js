const options = {
  'log-level': {
    describe: 'The log-level to generate',
    type: 'string',
    default: 'fatal',
    choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
  },
  'warnings-as-errors': {
    describe: 'Treat warnings as errors',
    type: 'boolean',
    default: false,
  },
  output: {
    alias: 'o',
    describe: 'The type of output to generate',
    type: 'string',
    default: 'text',
    choices: ['json', 'text'],
  },
  metadata: {
    describe: 'Output only metadata as JSON',
    type: 'boolean',
    default: false,
  },
  pretty: {
    describe: 'Prettify JSON output',
    type: 'boolean',
    default: false,
  },
  stack: {
    describe: 'Show stacktraces when errors are thrown',
    type: 'boolean',
    default: false,
  },
  boring: {
    describe: 'Disable colorful shell output',
    type: 'boolean',
    default: false,
  },
  enterprise: {
    describe: 'Treat the input file (or directory) as an enterprise extension',
    type: 'boolean',
    default: false,
  },
  privileged: {
    describe: 'Treat the input file (or directory) as a privileged extension',
    type: 'boolean',
    default: false,
  },
  'self-hosted': {
    describe: 'Disable messages related to hosting on addons.mozilla.org',
    type: 'boolean',
    default: false,
  },
  'enable-background-service-worker': {
    describe: 'Enable MV3 background service worker support',
    type: 'boolean',
    default: false,
  },
  'min-manifest-version': {
    describe:
      'Set a custom minimum allowed value for the manifest_version property',
    type: 'number',
    default: 2,
    requiresArg: true,
  },
  'max-manifest-version': {
    describe:
      'Set a custom maximum allowed value for the manifest_version property',
    type: 'number',
    default: 3,
    requiresArg: true,
  },
  'scan-file': {
    alias: ['f'],
    describe: 'Scan a selected file',
    type: 'string',
    requiresArg: true,
  },
  'disable-linter-rules': {
    describe: 'Disable list of comma separated eslint rules',
    type: 'string',
    requiresArg: true,
  },
  'disable-xpi-autoclose': {
    describe: 'Disable the auto-close feature when linting XPI files',
    type: 'boolean',
    default: false,
  },
};

export default options;

export function getDefaultConfigValue(name) {
  if (options[name] && 'default' in options[name]) {
    return options[name].default;
  }
  return undefined;
}
