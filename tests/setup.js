import sinon from 'sinon';

// Setup sinon global to be a sandbox which is restored
// after each test.
const realSinon = sinon;
global.sinon = realSinon.sandbox.create();
global.sinon.createStubInstance = realSinon.createStubInstance;
global.sinon.format = realSinon.format;
global.sinon.assert = realSinon.assert;

afterEach(() => {
  global.sinon.restore();
});
