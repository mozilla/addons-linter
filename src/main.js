import cli from 'cli';
import Validator from 'validator';
import log from 'logger';

import 'babel-core/polyfill';

export function createInstance(config=cli.argv) {
  log.level(config.logLevel);
  log.info('Creating new validator instance', { config: config });
  return new Validator(config);
}
