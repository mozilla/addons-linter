import cli from 'cli';
import Validator from 'validator';

export function createInstance() {
  return new Validator(cli.argv);
}
