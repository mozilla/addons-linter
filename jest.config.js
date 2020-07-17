module.exports = {
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/',
    '<rootDir>/config/',
  ],
  collectCoverageFrom: ['src/**/*.js'],
  moduleDirectories: ['src', 'node_modules'],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    // Alias tests for tests to be able to import helpers.
    '^tests/(.*)$': '<rootDir>/tests/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/tests/fixtures/',
    '<rootDir>/(bin|coverage|dist|docs|src)/',
    '<rootDir>/web-ext/',
  ],
  testMatch: [
    '<rootDir>/**/[Tt]est(*).js?(x)',
    '<rootDir>/**/__tests__/**/*.js?(x)',
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.txt$': 'jest-raw-loader',
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  testEnvironment: 'node',
  verbose: false,
};
