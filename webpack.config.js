const fs = require('fs');
const path = require('path');

// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');

const nodeModules = {};

// This is to filter out node_modules as we don't want them
// to be made part of any bundles.
fs.readdirSync('node_modules')
  .filter((x) => {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach((mod) => {
    nodeModules[mod] = `commonjs ${mod}`;
  });


module.exports = {
  // Set the webpack4 mode 'none' for compatibility with the behavior
  // of the webpack3 bundling step.
  mode: 'none',
  entry: './src/main.js',
  target: 'node',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'addons-linter.js',
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        use: 'babel-loader',
        // babel options are in .babelrc
        exclude: /(node_modules|bower_components)/,
        test: /\.js$/,
      },
      {
        use: 'raw-loader',
        exclude: /(node_modules|bower_components)/,
        test: /\.txt$/,
      },
    ],
  },
  externals: nodeModules,
  plugins: [
    new webpack.BannerPlugin(
      {
        banner: 'require("source-map-support").install();',
        raw: true,
        entryOnly: false,
      }
    ),
  ],
  resolve: {
    extensions: ['.js', '.json'],
    modules: [
      'src',
      'node_modules',
    ],
  },
  devtool: 'sourcemap',
};
