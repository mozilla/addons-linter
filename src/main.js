import cli from 'cli';
import Validator from 'validator';

import 'babel-core/polyfill';

export function createInstance() {
  return new Validator(cli.argv);
}
