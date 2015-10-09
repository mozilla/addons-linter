var webpackConfig = require('../webpack.config.js');
var path = require('path');

var defaultResolve = webpackConfig.resolve;

function noddyClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

var buildResolve = noddyClone(defaultResolve);
buildResolve.modulesDirectories.push('src/');

var testResolve = noddyClone(defaultResolve);
testResolve.modulesDirectories.push('coverage/');


module.exports = {
  options: webpackConfig,
  build: {
    resolve: buildResolve,
  },
  watch: {
    watch: true,
    keepalive: true,
  },
  test: {
    entry: './tests/runner.js',
    output: {
      path: path.join(__dirname, '../dist'),
      filename: 'tests.js',
    },
    resolve: testResolve,
  },
};
