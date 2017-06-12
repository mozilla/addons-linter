var webpackConfig = require('../webpack.config.js');

var defaultResolve = webpackConfig.resolve;

function noddyClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

var buildResolve = noddyClone(defaultResolve);
buildResolve.modules.push('src/');

module.exports = {
  options: webpackConfig,
  build: {
    resolve: buildResolve,
  },
  buildwatch: {
    watch: true,
    cache: true,
    keepalive: true,
    resolve: buildResolve,
  },
};
