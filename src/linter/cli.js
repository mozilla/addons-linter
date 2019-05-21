import yargs from 'yargs';
import { oneLine } from 'common-tags';

import log from 'linter/logger';
import options from 'linter/yargs-options';

import { version } from '../../package';

export function terminalWidth(_process = process) {
  if (_process && _process.stdout && _process.stdout.columns > 0) {
    let width = _process.stdout.columns - 2;
    // Terminals less than ten pixels wide seem silly.
    if (width < 10) {
      width = 10;
    }
    return width;
  }
  return 78;
}

export function getConfig({ useCLI = true, argv } = {}) {
  if (useCLI === false) {
    log.error(oneLine`Config requested from CLI, but not in CLI mode.
      Please supply a config instead of relying on the getConfig() call.`);
    throw new Error('Cannot request config from CLI in library mode');
  }

  // Used by test.main,js to override CLI arguments (because
  // the  process.argv array is controlled by jest),
  // See #1762 for a rationale.
  const cliArgv = argv ? yargs(argv) : yargs;

  return (
    cliArgv
      .usage(
        `Usage: ./$0 [options] addon-package-or-dir \n\n
      Add-ons Linter (JS Edition) v${version}`
      )
      .options(options)
      // Require one non-option.
      .demand(1)
      .help('help')
      .alias('h', 'help')
      .wrap(terminalWidth())
  );
}
