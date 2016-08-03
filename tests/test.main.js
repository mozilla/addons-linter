import { getConfig } from 'cli';
import { createInstance, isRunFromCLI } from 'main';


describe('Main module tests', function() {

  it('should error when used as library without explicit config', () => {
    assert.throws(() => {
      createInstance({
        config: getConfig({useCLI: isRunFromCLI(null)}).argv,
      });
    }, 'Cannot request config from CLI in library mode');
  });

  it('getConfig should not error when called via CLI', () => {
    assert.doesNotThrow(() => {
      createInstance({
        config: getConfig({useCLI: true}).argv,
      });
    });
  });

  it("should return false when modules don't match up", () => {
    assert.isFalse(isRunFromCLI(null));
  });

});
