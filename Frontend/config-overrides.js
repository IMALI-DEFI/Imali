const webpack = require('webpack');

module.exports = function override(config) {
  // Ensure fallback object exists
  config.resolve.fallback = config.resolve.fallback || {};

  // Add polyfills for Node.js core modules (including "url")
  Object.assign(config.resolve.fallback, {
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
    process: require.resolve("process/browser"),
    assert: require.resolve("assert/"),
    util: require.resolve("util/"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify/browser"),
    url: require.resolve("url/") // Added fallback for 'url'
  });

  // Provide global variables for modules that require them
  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"]
    })
  );

  // Optionally ignore specific warnings (e.g., source map warnings)
  config.ignoreWarnings = [/Failed to parse source map/];

  // Add file extensions if needed
  config.resolve.extensions = [...(config.resolve.extensions || []), ".ts", ".js"];

  // Update DefinePlugin definitions if present
  config.plugins.forEach(plugin => {
    if (plugin.constructor.name === "DefinePlugin") {
      // Set NODE_DEBUG to a JSON string value; adjust as needed.
      plugin.definitions = {
        ...plugin.definitions,
        "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || "")
      };
    }
  });

  return config;
};
