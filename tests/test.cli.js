import { getConfig, terminalWidth } from 'cli';


var cli;

describe('Basic CLI tests', function() {

  beforeEach(() => {
    // Override yargs fail func so we can introspect the right errors
    // are happening when we hand it bogus input.
    this.fakeFail = sinon.stub();
    cli = getConfig().exitProcess(false).fail(this.fakeFail);
  });

  it('should default logLevel type to "fatal"', () => {
    // This means by default there won't be any output.
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.logLevel, 'fatal');
    assert.equal(args['log-level'], 'fatal');
  });

  it('should default metadata option to false', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.metadata, false);
  });

  it('should default add-on output to "text"', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.output, 'text');
    assert.equal(args.o, 'text');
  });

  it('should default stack to false', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.stack, false);
  });

  it('should default pretty to false', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.pretty, false);
  });

  it('should default boring to false', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.boring, false);
  });

  it('should default warnings-as-errors to false', () => {
    var args = cli.parse(['foo/bar.zip']);
    assert.equal(args.warningsAsErrors, false);
  });

  it('should show error on missing xpi', () => {
    cli.parse([]);
    assert.ok(this.fakeFail.calledWithMatch(
      'Not enough non-option arguments'));
  });

  it('should show error if incorrect output', () => {
    cli.parse(['-o', 'false', 'whatevs']);
    assert.ok(
      this.fakeFail.calledWithMatch(
        'Invalid values:\n  Argument: output, Given: "false"'));
  });

  it('should use 78 as a width if process.stdout.columns is undefined', () => {
    var fakeProcess = null;
    assert.equal(terminalWidth(fakeProcess), 78);
    fakeProcess = {stdout: null};
    assert.equal(terminalWidth(fakeProcess), 78);
    fakeProcess = {stdout: {columns: null}};
    assert.equal(terminalWidth(fakeProcess), 78);
  });

  it('should always use a positive terminal width', () => {
    var fakeProcess = {stdout: {columns: 1}};
    assert.equal(terminalWidth(fakeProcess), 10);
  });

  it('should not use a width under 10 columns', () => {
    var fakeProcess = {stdout: {columns: 12}};
    assert.equal(terminalWidth(fakeProcess), 10);

    fakeProcess = {stdout: {columns: 11}};
    assert.equal(terminalWidth(fakeProcess), 10);

    fakeProcess = {stdout: {columns: 79}};
    assert.equal(terminalWidth(fakeProcess), 77);
  });

  it('should use a terminal width of $COLUMNS - 2', () => {
    var fakeProcess = {stdout: {columns: 170}};
    assert.equal(terminalWidth(fakeProcess), 168);
  });

  it('should have a default config when called via CLI', () => {
    let config = getConfig({useCLI: true}).argv;
    assert.isAbove(Object.keys(config).length, 0);
  });

  it('should error when requesting CLI config in library mode', () => {
    assert.throws(() => {
      getConfig({useCLI: false});
    }, 'Cannot request config from CLI in library mode');
  });

});
