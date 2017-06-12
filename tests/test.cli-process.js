import { checkOutput } from './helpers';
import { singleLineString } from 'utils';

import { getConfig } from 'cli';
import { createInstance } from 'main';

describe('Process', function() {

  it('should exit with exit code 0 when no errors.', () => {
    const args = ['tests/fixtures/good.zip', '--output json'];

    checkOutput(() => {
      createInstance({config: getConfig({useCLI: true}).argv});
    }, args, (output) => {
      expect(() => {
        JSON.parse(output.result);
      }).not.toThrow();

      expect(output.exitCode).toEqual(0);
    });
  });

  it('should exit with exit code 1 when errors found.', () => {
    let args = [
      'tests/fixtures/webextension_bad_permissions.zip',
      '--output json',
    ];

    checkOutput(() => {
      createInstance({config: getConfig({useCLI: true}).argv});
    }, args, (output) => {
      expect(() => {
        JSON.parse(output.result);
      }).not.toThrow();

      expect(output.exitCode).toEqual(1);
    });
  });

  it(singleLineString`should exit with exit code 1 when warnings found
    and --warnings-as-errors is used.`, () => {
    let args = [
      'tests/fixtures/webextension_warnings.zip',
      '--warnings-as-errors',
      '--output json'];

    checkOutput(() => {
      createInstance({config: getConfig({useCLI: true}).argv});
    }, args, (output) => {
      expect(() => {
        JSON.parse(output.result);
      }).not.toThrow();

      expect(output.exitCode).toEqual(1);
    });
  });

  it('should exit with exit code 0 when no errors for metadata.', () => {
    let args = ['tests/fixtures/good.zip', '--metadata'];

    checkOutput(() => {
      createInstance({config: getConfig({useCLI: true}).argv});
    }, args, (output) => {
      expect(() => {
        JSON.parse(output.result);
      }).not.toThrow();

      expect(output.exitCode).toEqual(0);
    });
  });

  it('should exit with exit code 1 when errors for metadata', () => {
    let args = ['tests/fixtures/badmeta.xpi', '--metadata'];

    checkOutput(() => {
      createInstance({config: getConfig({useCLI: true}).argv});
    }, args, (output) => {
      expect(() => {
        JSON.parse(output.result);
      }).not.toThrow();

      expect(output.exitCode).toEqual(1);
    });
  });
});
