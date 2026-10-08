import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, seoResponse } from './dist-server/entry-server.js';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const template = await readFile(path.join(root, 'index.html'), 'utf8');
const argument = process.argv.indexOf('--port');
const port = Number(argument >= 0 ? process.argv[argument + 1] : process.env.PORT || 4173);
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const target = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(400); return res.end(); }
    if (url.pathname !== '/' && url.pathname !== '/index.html') {
      try {
        if ((await stat(target)).isFile()) {
          res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
          return res.end(req.method === 'HEAD' ? '' : await readFile(target));
        }
      } catch { /* Public document routing handles missing paths. */ }
    }
    const result = await seoResponse(req.url, { template, render, origin: process.env.SEO_SITE_URL || 'https://estora-pi.vercel.app', apiOrigin: process.env.SEO_API_URL || process.env.VITE_API_URL || 'http://localhost:5000' });
    res.writeHead(result.status, result.headers);
    res.end(req.method === 'HEAD' ? '' : result.body);
  } catch {
    res.writeHead(503, { 'X-Robots-Tag': 'noindex' });
    res.end('Public information temporarily unavailable.');
  }
}).listen(port, 'localhost', () => console.log(`ESTORA production preview: http://localhost:${port}`));
