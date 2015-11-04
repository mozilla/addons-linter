import argv from 'yargs';

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
  // Require one non-option.
  .demand(1)
  .help('help')
  .alias('h', 'help')
  .wrap(terminalWidth());
