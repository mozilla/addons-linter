import { getConfig } from 'linter/cli';
import { createInstance } from 'main';

import { checkOutput } from './helpers';

// Unmock cli to test it (jest automatically host this call before the import
// section above.
jest.unmock('cli');

describe('Process', () => {
  it('should exit with exit code 0 when no errors.', () => {
    const args = ['tests/fixtures/good.zip', '--output json'];

    checkOutput(
      () => {
        createInstance({ config: getConfig({ useCLI: true }).argv });
      },
      args,
      (output) => {
        expect(() => {
          JSON.parse(output.result);
        }).not.toThrow();

        expect(output.exitCode).toEqual(0);
      }
    );
  });

  it('should exit with exit code 1 when errors found.', () => {
    const args = [
      'tests/fixtures/webextension_bad_permissions.zip',
      '--output json',
    ];

    checkOutput(
      () => {
        createInstance({ config: getConfig({ useCLI: true }).argv });
      },
      args,
      (output) => {
        expect(() => {
          JSON.parse(output.result);
        }).not.toThrow();

        expect(output.exitCode).toEqual(1);
      }
    );
  });

  it('should exit with exit code 1 when warnings found and --warnings-as-errors is used.', () => {
    const args = [
      'tests/fixtures/webextension_warnings.zip',
      '--warnings-as-errors',
      '--output json',
    ];

    checkOutput(
      () => {
        createInstance({ config: getConfig({ useCLI: true }).argv });
      },
      args,
      (output) => {
        expect(() => {
          JSON.parse(output.result);
        }).not.toThrow();

        expect(output.exitCode).toEqual(1);
      }
    );
  });

  it('should exit with exit code 0 when no errors for metadata.', () => {
    const args = ['tests/fixtures/good.zip', '--metadata'];

    checkOutput(
      () => {
        createInstance({ config: getConfig({ useCLI: true }).argv });
      },
      args,
      (output) => {
        expect(() => {
          JSON.parse(output.result);
        }).not.toThrow();

        expect(output.exitCode).toEqual(0);
      }
    );
  });

  it('should exit with exit code 1 when errors for metadata', () => {
    const args = ['tests/fixtures/badmeta.xpi', '--metadata'];

    checkOutput(
      () => {
        createInstance({ config: getConfig({ useCLI: true }).argv });
      },
      args,
      (output) => {
        expect(() => {
          JSON.parse(output.result);
        }).not.toThrow();

        expect(output.exitCode).toEqual(1);
      }
    );
  });
});
