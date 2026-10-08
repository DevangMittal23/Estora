import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

// Assets/HMR still belong to Vite; application/auth APIs stay on Render.
export function seoDevelopment({ apiOrigin, origin }) {
  return {
    name: 'estora-public-seo',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = new URL(`http://localhost${req.url}`).pathname;
        if (path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/') || path.startsWith('/assets/')) return next();
        if (/\.[a-z\d]+$/i.test(path) && !['/robots.txt', '/sitemap.xml', '/index.html'].includes(path)) {
          try {
            const file = resolve(server.config.publicDir, `.${decodeURIComponent(path)}`);
            const withinPublic = relative(server.config.publicDir, file);
            if (!withinPublic.startsWith('..') && !isAbsolute(withinPublic) && (await stat(file)).isFile()) return next();
          } catch { /* Missing file-like URLs must receive the document 404. */ }
        }
        if (!['GET', 'HEAD'].includes(req.method)) return next();
        try {
          const entry = await server.ssrLoadModule('/src/entry-server.jsx');
          const template = await server.transformIndexHtml(req.url, await readFile(new URL('./index.html', import.meta.url), 'utf8'));
          const result = await entry.seoResponse(req.url, { template, render: entry.render, apiOrigin, origin });
          res.writeHead(result.status, result.headers);
          res.end(req.method === 'HEAD' ? '' : result.body);
        } catch (error) {
          server.ssrFixStacktrace(error);
          console.error(error);
          res.writeHead(503, { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' });
          res.end('The public page is temporarily unavailable.');
        }
      });
    },
  };
}
