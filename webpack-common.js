import ExtractTextPlugin from 'extract-text-webpack-plugin';

const postCssPlugins = [];
const urlLoaderOptions = {
  limit: 10000,
};
const styleRules = [
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

export function getRules({ babelQuery } = {}) {
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
