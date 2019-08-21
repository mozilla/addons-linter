const config = require('./jest.config');

module.exports = {
  ...config,
  testMatch: ['<rootDir>/**/integration(*).js?(x)'],
};
