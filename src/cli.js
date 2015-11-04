import argv from 'yargs';

import { singleLineString } from 'utils';
import { version } from 'json!../package';


export function terminalWidth(_process=process) {
  if (_process && _process.stdout && _process.stdout.columns > 0) {
    var width = _process.stdout.columns - 2;
    // Terminals less than ten pixels wide seem silly.
    if (width < 10) {
      width = 10;
    }

    return width;
  } else {
    return 78;
  }
}

export default argv
  .usage('Usage: ./$0 [options] addon-package \n\n' +
    'Add-ons Validator (JS Edition) v' + version)
  .option('log-level', {
    describe: 'The log-level to generate',
    type: 'string',
    default: 'fatal',
    choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
  })
  .option('output', {
    alias: 'o',
    describe: 'The type of output to generate',
    type: 'string',
    default: 'text',
    choices: ['json', 'text'],
  })
  .option('pretty', {
    describe: 'Prettify JSON output',
    type: 'boolean',
    default: false,
  })
  .option('stack', {
    describe: 'Show stacktraces when errors are thrown',
    type: 'boolean',
    default: false,
  })
  .option('boring', {
    describe: 'Disables colorful shell output',
    type: 'boolean',
    default: false,
  })
  .option('target-maxversion', {
    describe: singleLineString`JSON string to override the package's
      targetapp_maxVersion for validation. The JSON object should be
      a dict of versions keyed by application GUID. For example,
      setting a package's max Firefox version to 5.*:
      {"{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": "5.*"}`,
    type: 'string',
  })
  .option('target-minversion', {
    describe: singleLineString`JSON string to override the package's
      targetapp_minVersion for validation. The JSON object should
      be a dict of versions keyed by application GUID. For example,
      setting a package's min Firefox version to 5.*:
      {"{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": "5.*"}`,
    type: 'string',
  })
  .option('for-appversions', {
    describe: singleLineString`JSON string to run validation tests for
      compatibility with a specific app/version. The JSON object should
      be a dict of version lists keyed by application GUID. For example,
      running Firefox 6.* compatibility tests:
      {"{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": ["6.*"]`,
    type: 'string',
  })
  // Require one non-option.
  .demand(1)
  .help('help')
  .alias('h', 'help')
  .wrap(terminalWidth());
