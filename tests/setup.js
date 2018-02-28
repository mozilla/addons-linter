import sinon from 'sinon';

// Setup sinon global to be a sandbox which is restored
// after each test.
const realSinon = sinon;
global.sinon = realSinon.sandbox.create();
global.sinon.createStubInstance = realSinon.createStubInstance;
global.sinon.format = realSinon.format;
global.sinon.assert = realSinon.assert;

// mock the cli module for every test (the ones that needs to use the real
// module may use jest.unmock, e.g. as in test.cli.js),
// See #1762 for a rationale.
jest.mock('cli', () => {
  return {
    getConfig: () => ({
      argv: {
        selfHosted: false,
        langpack: false,
      },
    }),
    terminalWidth: () => 78,
  };
});

afterEach(() => {
  global.sinon.restore();
  jest.resetModules();
  jest.resetAllMocks();
});
