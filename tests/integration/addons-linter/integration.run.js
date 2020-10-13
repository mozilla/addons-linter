import path from 'path';

import { executeScript } from '../helpers';

const expectedResult = '"summary":{"errors":0,"notices":0,"warnings":0}';

function resolveFixturePath(fixtureName) {
  return path.resolve(__dirname, '..', '..', 'fixtures', fixtureName);
}

describe('Integration/smoke tests', () => {
  it('should pass if ran on a simple valid extension', async () => {
    const fixture = resolveFixturePath('webextension_es6_module');
    const { exitCode, stderr, stdout } = await executeScript('addons-linter', [
      '-o',
      'json',
      fixture,
    ]);
    expect(stdout).toContain(expectedResult);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
  });

  it('should ignore .eslintignore files', async () => {
    const fixture = resolveFixturePath('webextension_with_eslintignore');
    const { exitCode, stderr, stdout } = await executeScript(
      'addons-linter',
      ['-o', 'json', fixture],
      {
        // .eslintignore file has to be in the current directory
        // to be loaded by eslint in its default config.
        cwd: fixture,
      }
    );

    expect(stdout).toContain(expectedResult);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
  });
});
