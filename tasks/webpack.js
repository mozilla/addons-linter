const webpackConfig = require('../webpack.config.js');

const defaultResolve = webpackConfig.resolve;

function noddyClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const buildResolve = noddyClone(defaultResolve);
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
