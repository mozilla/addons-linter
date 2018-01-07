var postCssPlugins = [];
import ExtractTextPlugin from 'extract-text-webpack-plugin';
const urlLoaderOptions = {
  limit: 10000,
};
export function getRules({ babelQuery, bundleStylesWithJs = false } = {}) {
  let styleRules;

    // In production, we create a separate CSS bundle rather than
    // include styles with the JS bundle. This lets the style bundle
    // load in parallel.
    styleRules = [
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: { importLoaders: 2, sourceMap: true },
            },
            {
              loader: 'postcss-loader',
              options: {
                outputStyle: 'expanded',
                plugins: () => postCssPlugins,
                sourceMap: true,
                sourceMapContents: true,
              },
            },
          ],
        }),
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: { importLoaders: 2, sourceMap: true },
            },
            {
              loader: 'postcss-loader',
              options: { plugins: () => postCssPlugins },
            },
            {
              loader: 'sass-loader',
              options: {
                outputStyle: 'expanded',
                sourceMap: true,
                sourceMapContents: true,
              },
            },
          ],
        }),
      },
    ];

  return [
    {
      test: /\.jsx?$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: babelQuery,
    },
    ...styleRules,
    {
      test: /\.svg$/,
      use: [{ loader: 'svg-url-loader', options: urlLoaderOptions }],
    }, {
      test: /\.(jpg|png|gif|webm|mp4|otf|woff|woff2)$/,
      use: [{ loader: 'url-loader', options: urlLoaderOptions }],
    },
  ];
}