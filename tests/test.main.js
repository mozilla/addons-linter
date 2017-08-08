import { getConfig } from 'cli';
import { createInstance, isRunFromCLI } from 'main';


describe('Main module tests', () => {
  it('should error when used as library without explicit config', () => {
    expect(() => {
      createInstance({
        config: getConfig({ useCLI: isRunFromCLI(null) }).argv,
      });
    }).toThrow('Cannot request config from CLI in library mode');
  });

  it('getConfig should not error when called via CLI', () => {
    expect(() => {
      createInstance({
        config: getConfig({ useCLI: true }).argv,
      });
    }).not.toThrow();
  });

  it("should return false when modules don't match up", () => {
    expect(isRunFromCLI(null)).toBe(false);
  });
});
