/*
 * Tests running the process via the CLI.
 *
 */

import shell from 'shelljs';

import { singleLineString } from 'utils';


describe('Process', function() {

  this.slow(5000);

  it('should exit with exit code 0 when no errors.', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/good.zip --output json';
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 0, output);
      done();
    });
  });

  it('should exit with exit code 1 when errors found.', (done) => {
    let cmd = singleLineString`bin/addons-linter
      tests/fixtures/webextension_bad_permissions.zip --output json`;
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 1, output);
      done();
    });
  });

  it( singleLineString`should exit with exit code 1 when warnings found
    and --warnings-as-errors is used.`, (done) => {
    let cmd = singleLineString`bin/addons-linter
      tests/fixtures/webextension_warnings.zip
      --warnings-as-errors --output json`;
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 1, output);
      done();
    });
  });

  it('should exit with exit code 0 when no errors for metadata.', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/good.zip --metadata';
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 0, output);
      done();
    });
  });

  it('should exit with exit code 1 when errors for metadata', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/badmeta.xpi --metadata';
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 1, output);
      done();
    });
  });

});
