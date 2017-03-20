const path = require('path');

const defaultOptions = {
  // Timeout is long due to tests that check *all* rules have been run.
  timeout: 15000,
  require: [
    function() {
      /*eslint-disable */
      // Monkey-patch mocha colors.
      // Change 90 to 38 so solarized users can see
      // stack-traces etc.
      var colors = require('mocha/lib/reporters/base').colors;
      colors['error stack'] = 38;
      colors['pass'] = 38;
      colors['diff gutter'] = 38;
      colors['fast'] = 38;
      colors['light'] = 38;
      assert = require('chai').assert;
      sinon = require('sinon');
      /*eslint-enable */
    },
  ],
  reporter: 'mocha-multi',
  reporterOptions: {
    spec: '-',
  },
};

const allFiles = ['dist/tests.js'];
const coverageReporterModulePath = path.resolve(
  path.join(__dirname, '../tests', 'coverage-reporter.js')
);

module.exports = {
  test: {
    options: defaultOptions,
    src: allFiles,
  },
  coverage: {
    options: Object.assign({}, defaultOptions, {
      reporterOptions: Object.assign({}, defaultOptions.reporterOptions, {
        [coverageReporterModulePath]: '-',
      }),
    }),
    src: allFiles,
  },
};
