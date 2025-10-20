import path from 'path';

import { oneLine } from 'common-tags';

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
    expect(stderr).toStrictEqual('');
    expect(exitCode).toEqual(0);
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
    expect(stderr).toStrictEqual('');
    expect(exitCode).toEqual(0);
  });

  it('should pass if ran on a simple valid CRX extension', async () => {
    const fixture = resolveFixturePath('crx3.crx');
    const { exitCode, stderr, stdout } = await executeScript('addons-linter', [
      // We disable this because the crx3.crx file doesn't include data
      // collection permissions.
      '--enable-data-collection-permissions=false',
      '-o',
      'json',
      fixture,
    ]);
    expect(stdout).toContain('"summary":{"errors":0,"notices":0,"warnings":1}');
    expect(stderr).toStrictEqual('');
    expect(exitCode).toEqual(0);
  });

  it('should log the expected error message on invalid --min/max-manifest-version range', async () => {
    const fixture = resolveFixturePath('webextension_es6_module');
    const { exitCode, stderr } = await executeScript('addons-linter', [
      '--min-manifest-version=3',
      '--max-manifest-version=2',
      fixture,
    ]);
    const expectedMessage = oneLine`
        Invalid manifest version range requested:
        --min-manifest-version (currently set to 3)
        should not be greater than
        --max-manifest-version (currently set to 2).
      `;
    expect(stderr).toStrictEqual(`${expectedMessage}\n`);
    expect(exitCode).toEqual(2);
  });
});
