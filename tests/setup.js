import fs from 'fs';
import path from 'path';

import sinon from 'sinon';

// Setup sinon global to be a sandbox which is restored
// after each test.
const realSinon = sinon;
global.sinon = realSinon.createSandbox();
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
      },
    }),
    terminalWidth: () => 78,
  };
});

global.appRoot = path.join(__dirname, '..');

if (!fs.existsSync(path.join(global.appRoot, 'dist'))) {
  throw new Error('Please run `npm run build` before running the test suite.');
}

afterEach(() => {
  global.sinon.restore();
});
