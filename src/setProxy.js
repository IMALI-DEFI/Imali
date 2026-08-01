const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api.imali-defi.com',
      changeOrigin: true,
      secure: false,
      headers: {
        'Origin': 'https://imali-defi.com'
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy encountered an error');
      }
    })
  );
};