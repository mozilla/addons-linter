var webpack = require('webpack');
var path = require('path');
var fs = require('fs');

var nodeModules = {};

// This is to filter out node_modules as we don't want them
// to be made part of any bundles.
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });


module.exports = {
  entry: './src/main.js',
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'addons-linter.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    loaders: [
      {
        exclude: /(node_modules|bower_components)/,
        test: /\.js$/,
        // babel options are in .babelrc
        loaders: ['babel'],
      },
      {
        test: /\.json$/,
        exclude: /(node_modules|bower_components|tests|package.json)/,
        loaders: ['json-loader'],
      },
    ],
  },
  externals: nodeModules,
  plugins: [
    new webpack.BannerPlugin('require("source-map-support").install();',
                             { raw: true, entryOnly: false }),
  ],
  resolve: {
    extensions: ['', '.js', '.json'],
    modulesDirectories: [
      'node_modules',
    ],
  },
  devtool: 'sourcemap',
};
