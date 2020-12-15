import path from 'path';
import { exec } from 'child_process';

// Allow to force the scripts bin paths using the TEST_BIN_PATH environment
// var, used on CI to run the tests on a production-like addons-linter package.
export const BIN_PATH = process.env.TEST_BIN_PATH
  ? process.env.TEST_BIN_PATH
  : path.join(__dirname, '../../bin/');

export function executeScript(scriptName, args = [], options = {}) {
  const scriptPath = path.join(BIN_PATH, scriptName);

  const execOptions = { shell: true, ...options };

  return new Promise((resolve) => {
    exec(
      `node ${scriptPath} ${args.join(' ')}`,
      execOptions,
      (error, stdout, stderr) => {
        const exitCode = error ? error.code : 0;

        resolve({
          exitCode,
          error,
          stderr,
          stdout,
        });
      }
    );
  });
}
