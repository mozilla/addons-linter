import path from 'path';
import { exec } from 'child_process';


export const BIN_PATH = path.join(__dirname, '../../bin/');
export function runLinter(args = [], options = {}) {
  return new Promise((resolve) => {
    options.env = options.env || {}; // eslint-disable-line no-param-reassign
    options.env.PATH = `${process.env.PATH}:${BIN_PATH}`; // eslint-disable-line no-param-reassign

    exec(`addons-linter ${args.join(' ')}`, options, (error, stdout, stderr) => {
      const exitCode = error ? error.code : 0;

      resolve({
        error,
        exitCode,
        stdout,
        stderr,
      });
    });
  });
}
