import argv from 'yargs';

import log from 'logger';
import { singleLineString } from 'utils';
import { version } from '../package.json';


export function getConfig({useCLI=true} = {}) {
  if (useCLI === false) {
    log.error(singleLineString`Config requested from CLI, but not in CLI mode.
      Please supply a config instead of relying on the getConfig() call.`);
    throw new Error('Cannot request config from CLI in library mode');
  }

  return argv
    .usage(`Usage: ./$0 [options] addon-package-or-dir \n\n
      Add-ons Linter (JS Edition) v${version}`)
    .option('log-level', {
      describe: 'The log-level to generate',
      type: 'string',
      default: 'fatal',
      choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    })
    .option('warnings-as-errors', {
      describe: 'Treat warning as errors',
      type: 'boolean',
      default: false,
    })
    .option('output', {
      alias: 'o',
      describe: 'The type of output to generate',
      type: 'string',
      default: 'text',
      choices: ['json', 'text'],
    })
    .option('metadata', {
      describe: 'Output only metadata as JSON',
      type: 'boolean',
      default: 'false',
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
    .option('self-hosted', {
      describe: 'Disables messages related to hosting on addons.mozilla.org.',
      type: 'boolean',
      default: false,
    })
    .option('scan-file', {
      alias: ['f'],
      describe: 'Scan a selected file',
      type: 'string',
      requiresArg: true,
    })
    // Require one non-option.
    .demand(1)
    .help('help')
    .alias('h', 'help')
    .wrap(terminalWidth());
}

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
