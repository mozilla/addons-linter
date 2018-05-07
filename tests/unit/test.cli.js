import { getConfig, terminalWidth } from 'cli';

// Unmock cli to test it (jest automatically host this call before the import
// section above.
jest.unmock('cli');

let cli;

describe('Basic CLI tests', function cliCallback() {
  beforeEach(() => {
    // Override yargs fail func so we can introspect the right errors
    // are happening when we hand it bogus input.
    this.fakeFail = sinon.stub();
    cli = getConfig().exitProcess(false).fail(this.fakeFail);
  });

  it('should default logLevel type to "fatal"', () => {
    // This means by default there won't be any output.
    const args = cli.parse(['foo/bar.zip']);
    expect(args.logLevel).toEqual('fatal');
    expect(args['log-level']).toEqual('fatal');
  });

  it('should default metadata option to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.metadata).toEqual(false);
  });

  it('should default add-on output to "text"', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.output).toEqual('text');
    expect(args.o).toEqual('text');
  });

  it('should default stack to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.stack).toEqual(false);
  });

  it('should default pretty to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.pretty).toEqual(false);
  });

  it('should default boring to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.boring).toEqual(false);
  });

  it('should support a --scan-file option', () => {
    let args = cli.parse(['foo/', '--scan-file', 'dir/test1.txt']);
    expect(args.scanFile).toEqual('dir/test1.txt');

    args = cli.parse([
      'foo/', '--scan-file', 'dir/test1.txt',
      '--scan-file', 'dir/test2.txt',
    ]);
    expect(args.scanFile).toEqual(['dir/test1.txt', 'dir/test2.txt']);

    args = cli.parse(['foo/']);
    expect(args.scanFile).toEqual(undefined);
  });

  it('should default warnings-as-errors to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.warningsAsErrors).toEqual(false);
  });

  it('should default langpack to false', () => {
    const args = cli.parse(['foo/bar.zip']);
    expect(args.langpack).toEqual(false);
  });

  it('should show error on missing xpi', () => {
    cli.parse([]);
    expect(this.fakeFail.calledWithMatch(
      'Not enough non-option arguments')).toBeTruthy();
  });

  it('should show error if incorrect output', () => {
    cli.parse(['-o', 'false', 'whatevs']);
    expect(this.fakeFail.calledWithMatch(
      'Invalid values:\n  Argument: output, Given: "false"')).toBeTruthy();
  });

  it('should use 78 as a width if process.stdout.columns is undefined', () => {
    let fakeProcess = null;
    expect(terminalWidth(fakeProcess)).toEqual(78);
    fakeProcess = { stdout: null };
    expect(terminalWidth(fakeProcess)).toEqual(78);
    fakeProcess = { stdout: { columns: null } };
    expect(terminalWidth(fakeProcess)).toEqual(78);
  });

  it('should always use a positive terminal width', () => {
    const fakeProcess = {
      stdout: {
        columns: 1,
      },
    };
    expect(terminalWidth(fakeProcess)).toEqual(10);
  });

  it('should not use a width under 10 columns', () => {
    let fakeProcess = {
      stdout: {
        columns: 12,
      },
    };
    expect(terminalWidth(fakeProcess)).toEqual(10);
    fakeProcess = {
      stdout: {
        columns: 11,
      },
    };
    expect(terminalWidth(fakeProcess)).toEqual(10);

    fakeProcess = {
      stdout: {
        columns: 79,
      },
    };
    expect(terminalWidth(fakeProcess)).toEqual(77);
  });

  it('should use a terminal width of $COLUMNS - 2', () => {
    const fakeProcess = {
      stdout: {
        columns: 170,
      },
    };
    expect(terminalWidth(fakeProcess)).toEqual(168);
  });

  it('should have a default config when called via CLI', () => {
    const config = getConfig({ useCLI: true }).argv;
    expect(Object.keys(config).length).toBeGreaterThan(0);
  });

  it('should error when requesting CLI config in library mode', () => {
    expect(() => {
      getConfig({ useCLI: false });
    }).toThrow('Cannot request config from CLI in library mode');
  });
});
