var grunt = require('grunt');
var path = require('path');
var webpackConfig = require('../webpack.config.js');

var defaultResolve = webpackConfig.resolve;

function noddyClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

var buildResolve = noddyClone(defaultResolve);
buildResolve.modulesDirectories.push('src/');

var coverageResolve = noddyClone(defaultResolve);
coverageResolve.modulesDirectories.push('coverage/');

// Get the entry-points for the eslint rules using grunt's
// utils to allow use to use a wildcard.
// Based on http://stackoverflow.com/a/22715972/156158
var eslintRulesBasePath = path.resolve('src/rules/javascript');
var eslintRules = grunt.file.expand({ cwd: eslintRulesBasePath }, '*')
  .reduce(function(map, page) {
    map[path.basename(page)] = path.join(eslintRulesBasePath, page);
    return map;
  }, {});

var eslintConfig = {
  entry: eslintRules,
  output: {
    path: path.join(__dirname, '../dist/eslint/'),
    filename: '[name]',
  },
};

var testConfig = {
  entry: './tests/runner.js',
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'tests.js',
  },
};

module.exports = {
  options: webpackConfig,
  build: {
    resolve: buildResolve,
  },
  buildwatch: {
    watch: true,
    keepalive: true,
    resolve: buildResolve,
  },
  coverage: {
    entry: testConfig.entry,
    output: testConfig.output,
    resolve: coverageResolve,
  },
  test: {
    entry: testConfig.entry,
    output: testConfig.output,
    resolve: buildResolve,
  },
  // Webpack conf to pre-process all the eslint rules
  // without bundling.
  eslint: {
    entry: eslintConfig.entry,
    output: eslintConfig.output,
    resolve: buildResolve,
  },
  eslintwatch: {
    entry: eslintConfig.entry,
    output: eslintConfig.output,
    resolve: buildResolve,
    watch: true,
  },

};
