import cli from 'cli';
import Linter from 'linter';
import log from 'logger';

import 'babel-polyfill';

export function createInstance({config=cli.argv, runAsBinary=false} = {}) {
  log.level(config.logLevel);
  log.info('Creating new linter instance', { config: config });
  config.runAsBinary = runAsBinary;
  return new Linter(config);
}
