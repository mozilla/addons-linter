import { cli as cli_ } from 'cli';


// Sneaky way to make the cli throw so we can introspect the right errors
// are happening when we hand it bogus input.

var cli = cli_.exitProcess(false).fail(msg => {
  throw new Error(msg);
});


describe('Basic CLI tests', function() {

  it('should default Add-on type to "any"', () => {
    var args = cli.parse(['foo/bar.xpi']);
    assert.equal(args.type, 'any');
    assert.equal(args.t, 'any');
  });

  it('should default add-on output to "text"', () => {
    var args = cli.parse(['foo/bar.xpi']);
    assert.equal(args.output, 'text');
    assert.equal(args.o, 'text');
  });

  it('should default selfhosted to false', () => {
    var args = cli.parse(['foo/bar.xpi']);
    assert.equal(args.selfhosted, false);
  });

  it('should default determined to false', () => {
    var args = cli.parse(['foo/bar.xpi']);
    assert.equal(args.determined, false);
  });

  it('should default boring to false', () => {
    var args = cli.parse(['foo/bar.xpi']);
    assert.equal(args.boring, false);
  });

  it('should show error on missing xpi', () => {
    assert.throws(() => {
      cli.parse([]);
    }, Error, 'Not enough non-option arguments');
  });

  it('should show error if incorrect type', () => {
    assert.throws(() => {
      cli.parse(['-t', 'false', 'whatevs']);
    }, Error, 'Invalid values:\n  Argument: type, Given: "false"');
  });

  it('should show error if incorrect output', () => {
    assert.throws(() => {
      cli.parse(['-o', 'false', 'whatevs']);
    }, Error, 'Invalid values:\n  Argument: output, Given: "false"');
  });

});

