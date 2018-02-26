const config = require('./jest.config');


module.exports = Object.assign({}, config, {
  testMatch: [
    '<rootDir>/**/integration(*).js?(x)',
  ],
});
