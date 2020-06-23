import path from 'path';

import { executeScript } from '../helpers';

describe('Integration/smoke tests', () => {
  it('should pass if ran on a simple valid extension', async () => {
    const fixture = path.resolve(
      __dirname,
      '..',
      '..',
      'fixtures',
      'webextension_es6_module'
    );
    const { exitCode, stderr, stdout } = await executeScript('addons-linter', [
      '-o',
      'json',
      fixture,
    ]);
    expect(stdout).toContain('"summary":{"errors":0,"notices":0,"warnings":0}');
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
  });
});
