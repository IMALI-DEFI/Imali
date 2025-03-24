const { override, addWebpackPlugin } = require('customize-cra');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = override(
  addWebpackPlugin(new CleanWebpackPlugin()),
  (config) => {
    // Ensure the fallback object exists
    config.resolve.fallback = config.resolve.fallback || {};

    // Add fallbacks for Node.js core modules
    Object.assign(config.resolve.fallback, {
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      process: require.resolve("process/browser"),
      assert: require.resolve("assert/"),
      util: require.resolve("util/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      url: require.resolve("url")
    });

    // Ensure the plugins array exists
    config.plugins = config.plugins || [];

    // Add the ProvidePlugin to make process and Buffer globally available
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"]
      })
    );

    // Add source-map-loader configuration
    config.module.rules.push({
      test: /\.js$/,
      enforce: 'pre',
      use: ['source-map-loader'],
      exclude: /node_modules\/@walletconnect\/.*/,
    });

    // Add ignoreWarnings configuration
    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
  }
);