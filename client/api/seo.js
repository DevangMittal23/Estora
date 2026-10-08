import { readFile } from 'node:fs/promises';
import { render, seoResponse } from '../dist-server/entry-server.js';

const template = readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    return res.end();
  }
  try {
    const url = new URL(req.url, 'https://estora-pi.vercel.app');
    const route = req.query?.route;
    if (typeof route === 'string') { url.pathname = `/${route}`; url.searchParams.delete('route'); }
    const result = await seoResponse(`${url.pathname}${url.search}`, {
      template: await template,
      render,
      origin: process.env.SEO_SITE_URL || process.env.VITE_SITE_URL || 'https://estora-pi.vercel.app',
      apiOrigin: process.env.SEO_API_URL || process.env.VITE_API_URL || 'https://estora-api.onrender.com',
      preview: process.env.VERCEL_ENV === 'preview',
    });
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
    res.statusCode = result.status;
    res.end(req.method === 'HEAD' ? '' : result.body);
  } catch {
    res.statusCode = 503;
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Public information temporarily unavailable.');
  }
}
