const webpack = require('webpack');

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer/"),
        "process": require.resolve("process/browser"),
        "assert": require.resolve("assert/"),
        "util": require.resolve("util/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser")
    });
    config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    ]);
    config.ignoreWarnings = [/Failed to parse source map/];
    config.plugins.forEach(plugin => {
        if (plugin.constructor.name === 'DefinePlugin') {
            plugin.definitions = {
                ...plugin.definitions,
                'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
            };
        }
    });
    config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"]
    config.plugins.forEach(plugin => {
        if (plugin.constructor.name === 'DefinePlugin') {
            plugin.definitions = {
                ...plugin.definitions,
                'process.env.NODE_DEBUG': undefined,
            };
        }
    });

    return config;
};