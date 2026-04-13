const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 4173);
const API_TARGET_HOST = process.env.API_TARGET_HOST || '10.10.10.21';
const API_TARGET_PORT = Number(process.env.API_TARGET_PORT || 3000);
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const sendFile = (res, filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
};

const forwardApiRequest = (req, res) => {
  const headers = {
    ...req.headers,
    host: API_TARGET_HOST,
    'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
    'x-forwarded-host': req.headers.host || '',
  };

  const options = {
    hostname: API_TARGET_HOST,
    port: API_TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    const payload = JSON.stringify({
      error: 'API proxy failed',
      message: String(error.message || error),
      target: `${API_TARGET_HOST}:${API_TARGET_PORT}`,
      path: req.url,
    });

    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(payload);
  });

  req.pipe(proxyReq);
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (req.url.startsWith('/api/')) {
    forwardApiRequest(req, res);
    return;
  }

  const rawPath = req.url.split('?')[0];
  const requestPath = rawPath === '/' ? '/index.html' : rawPath;
  const normalizedPath = path.normalize(requestPath).replace(/^\.+/, '');
  const filePath = path.join(DIST_DIR, normalizedPath);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    // SPA fallback for client-side routes.
    sendFile(res, INDEX_FILE);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[sportportal] listening on http://${HOST}:${PORT}`);
  console.log(`[sportportal] proxying /api/* -> http://${API_TARGET_HOST}:${API_TARGET_PORT}`);
});
