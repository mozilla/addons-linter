/* eslint import/order: 0 */
const glob = require('glob');
const path = require('path');

// eslint-disable-next-line import/no-extraneous-dependencies
const webpack = require('webpack');
// eslint-disable-next-line import/no-extraneous-dependencies
const nodeExternals = require('webpack-node-externals');

module.exports = {
  // Set the webpack4 mode 'none' for compatibility with the behavior
  // of the webpack3 bundling step.
  mode: 'none',
  entry: {
    'addons-linter': './src/main.js',
    ...glob.sync('./src/rules/javascript/*.js').reduce((acc, file) => {
      acc[file.replace(/^\.\/src\//, '').replace('.js', '')] = file;
      return acc;
    }, {}),
  },
  target: 'node',
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    libraryExport: 'default',
    path: path.join(__dirname, 'dist'),
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
  externals: [
    nodeExternals({
      modulesFromFile: true,
    }),
  ],
  plugins: [
    new webpack.BannerPlugin({
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false,
    }),
  ],
  resolve: {
    extensions: ['.js', '.json'],
    modules: ['src', 'node_modules'],
  },
  devtool: 'sourcemap',
  node: {
    __dirname: false,
  },
};
