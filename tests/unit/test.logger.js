import { createLogger } from 'linter/logger';

describe('logger.createLogger()', () => {
  it('should throw if LOG_LEVEL is not an expected value', () => {
    expect(() => {
      const fakeProcess = {
        env: {
          LOG_LEVEL: 'whatever',
        },
      };
      createLogger(fakeProcess);
    }).toThrow(/level:whatever must be included in custom levels/);
  });
});
