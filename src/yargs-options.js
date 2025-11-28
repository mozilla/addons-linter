import { DEFAULT_CONFIG } from './const';

const options = {
  'log-level': {
    describe: 'The log-level to generate',
    type: 'string',
    default: DEFAULT_CONFIG.logLevel,
    choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
  },
  'warnings-as-errors': {
    describe: 'Treat warnings as errors',
    type: 'boolean',
    default: DEFAULT_CONFIG.warningsAsErrors,
  },
  output: {
    alias: 'o',
    describe: 'The type of output to generate',
    type: 'string',
    default: DEFAULT_CONFIG.output,
    choices: ['json', 'text'],
  },
  metadata: {
    describe: 'Output only metadata as JSON',
    type: 'boolean',
    default: DEFAULT_CONFIG.metadata,
  },
  pretty: {
    describe: 'Prettify JSON output',
    type: 'boolean',
    default: DEFAULT_CONFIG.pretty,
  },
  stack: {
    describe: 'Show stacktraces when errors are thrown',
    type: 'boolean',
    default: DEFAULT_CONFIG.stack,
  },
  boring: {
    describe: 'Disable colorful shell output',
    type: 'boolean',
    default: DEFAULT_CONFIG.boring,
  },
  enterprise: {
    describe:
      'Treat the input file (or directory) as an enterprise extension (implies --self-hosted)',
    type: 'boolean',
    default: DEFAULT_CONFIG.enterprise,
  },
  privileged: {
    describe: 'Treat the input file (or directory) as a privileged extension',
    type: 'boolean',
    default: DEFAULT_CONFIG.privileged,
  },
  'self-hosted': {
    describe: 'Disable messages related to hosting on addons.mozilla.org',
    type: 'boolean',
    default: DEFAULT_CONFIG.selfHosted,
  },
  'enable-background-service-worker': {
    describe: 'Enable MV3 background service worker support',
    type: 'boolean',
    default: DEFAULT_CONFIG.enableBackgroundServiceWorker,
  },
  'min-manifest-version': {
    describe:
      'Set a custom minimum allowed value for the manifest_version property',
    type: 'number',
    default: DEFAULT_CONFIG.minManifestVersion,
    requiresArg: true,
  },
  'max-manifest-version': {
    describe:
      'Set a custom maximum allowed value for the manifest_version property',
    type: 'number',
    default: DEFAULT_CONFIG.maxManifestVersion,
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
    default: DEFAULT_CONFIG.disableXpiAutoclose,
  },
  'enable-data-collection-permissions': {
    describe: 'Enable data collection permissions support',
    type: 'boolean',
    default: DEFAULT_CONFIG.enableDataCollectionPermissions,
  },
};

export default options;

export function getDefaultConfigValue(name) {
  if (options[name] && 'default' in options[name]) {
    return options[name].default;
  }
  return undefined;
}
