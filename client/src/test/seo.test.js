import { describe, it, expect, vi } from 'vitest';
import { metadataFor, headMarkup, safeJson, publicPages, publishedArticles } from '../seo/metadata';
import { seoResponse, publicProperty, sitemapXml, robotsTxt } from '../seo/server';
import { propertyId, propertyPath, publicImageUrl, siteOrigin } from '../seo/urls';

const property = { _id: '507f1f77bcf86cd799439011', title: 'Aurelia <Residences>', city: 'Noida', status: 'LIVE', unitPrice: 1000000, minUnits: 2, totalUnits: 100, unitsSold: 10, images: [{ url: '/api/v1/media/507f1f77bcf86cd799439012' }] };
const origin = 'https://estora-pi.vercel.app';
const apiOrigin = 'http://localhost:5010';
const template = '<html><head><!--seo-head--></head><body><div id="root"><!--seo-outlet--></div><!--seo-state--></body></html>';
const options = (fetcher) => ({ template, render: async () => '<h1>Public page</h1>', origin, apiOrigin, fetcher });

describe('Canonical public SEO output', () => {
  it('uses stable unique slug IDs while old IDs remain resolvable', () => {
    expect(propertyPath(property)).toBe('/properties/aurelia-residences-noida-507f1f77bcf86cd799439011');
    expect(propertyId(propertyPath(property).split('/').pop())).toBe(property._id);
    expect(propertyId(property._id)).toBe(property._id);
    expect(propertyId('no-property')).toBeNull();
  });
  it('rejects non-HTTPS origins and canonicalizes tracking and catalogue filters', () => {
    expect(() => siteOrigin('http://estora.in')).toThrow();
    expect(metadataFor('/properties', { query: '?utm_source=mail&ref=abc' }).robots).toContain('index,');
    const filtered = metadataFor('/properties', { query: '?city=Noida&sort=price' });
    expect(filtered.canonical).toBe(`${origin}/properties`);
    expect(filtered.robots).toContain('noindex');
  });
  it('provides unique metadata only for published public routes', () => {
    const routes = [...Object.keys(publicPages), ...publishedArticles().map((article) => `/insights/${article.slug}`)];
    const results = routes.map((route) => metadataFor(route));
    expect(new Set(results.map((meta) => meta.title)).size).toBe(routes.length);
    expect(new Set(results.map((meta) => meta.description)).size).toBe(routes.length);
    for (const meta of results) expect(headMarkup(meta)).toContain('og:image');
    for (const route of ['/login', '/signup', '/reset-password/secret', '/investor/wallet', '/broker', '/admin/users', '/profile', '/notifications']) {
      const meta = metadataFor(route);
      expect(meta.robots).toContain('noindex');
      expect(meta.canonical).toBeNull();
      expect(meta.structured).toEqual([]);
      expect(headMarkup(meta)).not.toContain('secret');
    }
  });
  it('uses accurate non-Product schema and safely escapes embedded content', () => {
    const meta = metadataFor(propertyPath(property), { property, apiOrigin });
    expect(meta.structured.map((item) => item['@type'])).toEqual(['BreadcrumbList']);
    expect(meta.canonical).toBe(`${origin}${propertyPath(property)}`);
    expect(headMarkup(meta)).toContain('Aurelia &lt;Residences&gt;');
    expect(safeJson({ title: '</script><script>alert(1)</script>' })).not.toContain('</script>');
    expect(metadataFor('/').structured.map((item) => item['@type'])).toEqual(['Organization', 'WebSite']);
    expect(metadataFor(`/insights/${publishedArticles()[0].slug}`).structured.some((item) => item['@type'] === 'Article')).toBe(true);
  });
  it('does not serialize private fields, unpublished records or signed media', () => {
    const data = publicProperty({ ...property, brokerId: 'private', approvedBy: 'private', rejectionReason: 'private', walletBalance: 123, documents: [{ url: '/private-document' }], investors: [{ name: 'private' }], token: 'private' }, apiOrigin, origin);
    expect(JSON.stringify(data)).not.toContain('private');
    expect(publicProperty({ ...property, status: 'DRAFT' }, apiOrigin, origin)).toBeNull();
    expect(publicImageUrl({ url: 'https://res.cloudinary.com/demo/image/authenticated/s--abc--/x.jpg' }, apiOrigin)).toBeNull();
    expect(publicImageUrl({ url: 'https://images.example.com/a.jpg?token=secret' }, apiOrigin)).toBeNull();
  });
  it('sitemap and robots include canonical public URLs and exclude drafts/private routes', () => {
    const xml = sitemapXml([property, { ...property, status: 'DRAFT', title: 'private draft' }]);
    expect(xml).toContain(`${origin}${propertyPath(property)}`);
    expect(xml).not.toMatch(/private draft|\/login|\/admin|utm_source/);
    expect(robotsTxt()).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robotsTxt()).toContain('Disallow: /admin/');
  });
});

describe('Public HTTP behavior', () => {
  it('redirects the HTML entry URL without creating a duplicate homepage', async () => {
    const response = await seoResponse('/index.html?utm_source=link', options(vi.fn()));
    expect(response.status).toBe(308);
    expect(response.headers.Location).toBe('/?utm_source=link');
  });
  it('permanently redirects legacy and stale property paths to one canonical slug', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: property }) }));
    const response = await seoResponse(`/properties/${property._id}?ref=abc`, options(fetcher));
    expect(response.status).toBe(301);
    expect(response.headers.Location).toBe(propertyPath(property));
    expect(fetcher.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
  });
  it('returns real 404s and noindex for unknown or unavailable properties', async () => {
    const fetcher = async () => ({ ok: false, status: 404 });
    for (const url of ['/missing', '/insights/missing', '/real-estate-investment-in-missing', `/properties/missing-${property._id}`, '/properties/invalid']) {
      const response = await seoResponse(url, options(fetcher));
      expect(response.status).toBe(404);
      expect(response.headers['X-Robots-Tag']).toBe('noindex');
    }
  });
  it('returns retryable 503s instead of indexing an invented empty catalogue', async () => {
    const fetcher = async () => { throw new Error('Offline'); };
    const response = await seoResponse('/properties', options(fetcher));
    expect(response.status).toBe(503);
    expect(response.headers['Retry-After']).toBe('60');
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
    expect((await seoResponse('/sitemap.xml', options(fetcher))).status).toBe(503);
  });
  it('leaves protected routes as a noindex SPA shell without public API reads', async () => {
    const fetcher = vi.fn();
    const response = await seoResponse('/admin/users', options(fetcher));
    expect(response.status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
    expect(response.body).not.toContain('<h1>Public page</h1>');
  });
  it('marks Vercel previews noindex and blocks preview robots', async () => {
    const response = await seoResponse('/fractional-real-estate', { ...options(vi.fn()), preview: true });
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
    expect(response.body).not.toContain('application/ld+json');
    expect(response.body).toContain('"preview":true');
    expect((await seoResponse('/robots.txt', { ...options(vi.fn()), preview: true })).body).toContain('Disallow: /');
  });
});
