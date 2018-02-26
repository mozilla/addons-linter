const { runLinter } = require('./runLinter');


describe('Basic integration test', () => {
  it('linter should fail if ran without params with explanation', async () => {
    const { exitCode, stderr } = await runLinter();
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Not enough non-option arguments: got 0, need at least 1');
  });
});
