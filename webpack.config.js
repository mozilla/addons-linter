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
    filename: 'addon-validator.js',
  },
  module: {
    loaders: [
      {
        exclude: /(node_modules|bower_components)/,
        test: /\.js$/,
        // es7.objectRestSpread to enable ES7 rest spread operators
        // eg: let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
        loaders: ['babel?optional[]=es7.objectRestSpread&' +
                  'optional[]=es7.classProperties&stage=2'],
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
      'src/',
    ],
  },
  devtool: 'sourcemap',
};
