/*
 * Tests running the process via the CLI.
 *
 */

import shell from 'shelljs';


describe('Process', function() {

  it('should exit with exit code 0 when no errors.', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/good.xpi --output json';
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 0, output);
      done();
    });
  });

  it('should exit with exit code 1 when errors found.', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/example.xpi --output json';
    shell.exec(cmd, {silent: true}, (code, output) => {
      assert.doesNotThrow(() => {
        JSON.parse(output);
      });
      assert.equal(code, 1, output);
      done();
    });
  });

  it('should exit with exit code 0 when no errors for metadata.', (done) => {
    let cmd = 'bin/addons-linter tests/fixtures/good.xpi --metadata';
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
