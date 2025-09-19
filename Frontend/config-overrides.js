const webpack = require('webpack');

module.exports = function override(config) {

  config.resolve.fallback = config.resolve.fallback || {};

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

  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"]
    })
  );

  return config;
};