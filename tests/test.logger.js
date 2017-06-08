import { createLogger } from 'logger';

describe('logger.createLogger()', function() {

  it('should throw if LOG_LEVEL is not an expected value', () => {
    expect(() => {
      var fakeProcess = {
        env: {
          LOG_LEVEL: 'whatever',
        },
      };
      createLogger(fakeProcess);
    }).toThrow(/LOG_LEVEL must be one of/);
  });

});
