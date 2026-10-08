import { describe, it, expect, vi } from 'vitest';
import {
  metadataFor,
  headMarkup,
  safeJson,
  publicPages,
  publishedArticles,
} from '../seo/metadata';
import {
  seoResponse,
  publicProperty,
  sitemapXml,
  robotsTxt,
} from '../seo/server';
import {
  canonicalPath,
  propertyId,
  propertyPath,
  publicImageUrl,
  siteOrigin,
} from '../seo/urls';

const property = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Aurelia <Residences>',
  city: 'Noida',
  status: 'LIVE',
  unitPrice: 1000000,
  minUnits: 2,
  totalUnits: 100,
  unitsSold: 10,
  images: [{ url: '/api/v1/media/507f1f77bcf86cd799439012' }],
};
const origin = 'https://estora-pi.vercel.app';
const apiOrigin = 'http://localhost:5010';
const template =
  '<html><head><!--seo-head--></head><body><div id="root"><!--seo-outlet--></div><!--seo-state--></body></html>';
const options = (fetcher) => ({
  template,
  render: async () => '<h1>Public page</h1>',
  origin,
  apiOrigin,
  fetcher,
});

describe('Canonical public SEO output', () => {
  it('uses stable unique slug IDs while old IDs remain resolvable', () => {
    expect(propertyPath(property)).toBe(
      '/properties/aurelia-residences-noida-507f1f77bcf86cd799439011'
    );
    expect(propertyId(propertyPath(property).split('/').pop())).toBe(
      property._id
    );
    expect(propertyId(property._id)).toBe(property._id);
    expect(propertyId('no-property')).toBeNull();
  });
  it('rejects non-HTTPS origins and canonicalizes tracking and catalogue filters', () => {
    expect(() => siteOrigin('http://estora.in')).toThrow();
    expect(
      metadataFor('/properties', { query: '?utm_source=mail&ref=abc' }).robots
    ).toContain('index,');
    const filtered = metadataFor('/properties', {
      query: '?city=Noida&sort=price',
    });
    expect(filtered.canonical).toBe(`${origin}/properties`);
    expect(filtered.robots).toContain('noindex');
  });
  it('provides unique metadata only for published public routes', () => {
    const routes = [
      ...Object.keys(publicPages),
      ...publishedArticles().map((article) => `/insights/${article.slug}`),
    ];
    const results = routes.map((route) => metadataFor(route));
    expect(new Set(results.map((meta) => meta.title)).size).toBe(routes.length);
    expect(new Set(results.map((meta) => meta.description)).size).toBe(
      routes.length
    );
    for (const meta of results) expect(headMarkup(meta)).toContain('og:image');
    for (const route of [
      '/login',
      '/signup',
      '/reset-password/secret',
      '/investor/wallet',
      '/broker',
      '/admin/users',
      '/profile',
      '/notifications',
    ]) {
      const meta = metadataFor(route);
      expect(meta.robots).toContain('noindex');
      expect(meta.canonical).toBeNull();
      expect(meta.structured).toEqual([]);
      expect(headMarkup(meta)).not.toContain('secret');
    }
  });
  it('uses accurate non-Product schema and safely escapes embedded content', () => {
    const meta = metadataFor(propertyPath(property), { property, apiOrigin });
    expect(meta.structured.map((item) => item['@type'])).toEqual([
      'BreadcrumbList',
    ]);
    expect(meta.canonical).toBe(`${origin}${propertyPath(property)}`);
    expect(headMarkup(meta)).toContain('Aurelia &lt;Residences&gt;');
    expect(
      safeJson({ title: '</script><script>alert(1)</script>' })
    ).not.toContain('</script>');
    expect(metadataFor('/').structured.map((item) => item['@type'])).toEqual([
      'Organization',
      'WebSite',
    ]);
    expect(
      metadataFor(`/insights/${publishedArticles()[0].slug}`).structured.some(
        (item) => item['@type'] === 'Article'
      )
    ).toBe(true);
  });
  it('does not serialize private fields, unpublished records or signed media', () => {
    const data = publicProperty(
      {
        ...property,
        brokerId: 'private',
        approvedBy: 'private',
        rejectionReason: 'private',
        walletBalance: 123,
        documents: [{ url: '/private-document' }],
        investors: [{ name: 'private' }],
        token: 'private',
      },
      apiOrigin,
      origin
    );
    expect(JSON.stringify(data)).not.toContain('private');
    expect(
      publicProperty({ ...property, status: 'DRAFT' }, apiOrigin, origin)
    ).toBeNull();
    expect(
      publicImageUrl(
        {
          url: 'https://res.cloudinary.com/demo/image/authenticated/s--abc--/x.jpg',
        },
        apiOrigin
      )
    ).toBeNull();
    expect(
      publicImageUrl(
        { url: 'https://images.example.com/a.jpg?token=secret' },
        apiOrigin
      )
    ).toBeNull();
  });
  it('sitemap and robots include canonical public URLs and exclude drafts/private routes', () => {
    const xml = sitemapXml([
      property,
      { ...property, status: 'DRAFT', title: 'private draft' },
    ]);
    expect(xml).toContain(`${origin}${propertyPath(property)}`);
    expect(xml).not.toMatch(/private draft|\/login|\/admin|utm_source/);
    expect(robotsTxt()).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robotsTxt()).toContain('Disallow: /admin/');
  });
});

describe('Public HTTP behavior', () => {
  it('normalizes public duplicates without rewriting recovery-token case or encoded slashes', async () => {
    expect(
      canonicalPath('/INSIGHTS//%72ental-yield-and-the-costs-behind-it/')
    ).toBe('/insights/rental-yield-and-the-costs-behind-it');
    expect(canonicalPath('/reset/AbC123')).toBe('/reset/AbC123');
    expect(canonicalPath('/properties/name%2Fother')).toBe(
      '/properties/name%2fother'
    );
    const response = await seoResponse(
      '//PROPERTIES/?utm_source=mail',
      options(vi.fn())
    );
    expect(response.status).toBe(308);
    expect(response.headers.Location).toBe('/properties?utm_source=mail');
  });
  it('never echoes password-reset tokens in the private document state', async () => {
    for (const path of [
      '/reset/SecretToken-AbC',
      '/reset-password/SecretToken-AbC',
    ]) {
      const response = await seoResponse(path, options(vi.fn()));
      expect(response.body).not.toContain('SecretToken-AbC');
      expect(response.body).not.toContain('"pathname"');
      expect(response.headers['Cache-Control']).toBe('no-store');
    }
    for (const path of ['login', 'signup', 'forgot-password'])
      expect(robotsTxt()).not.toContain(`Disallow: /${path}`);
  });
  it('deduplicates sitemap properties, ignores invalid identifiers and reads every API page', async () => {
    const second = {
      ...property,
      _id: '507f1f77bcf86cd799439013',
      title: 'Second property',
      status: 'FUNDED',
    };
    const xml = sitemapXml([
      property,
      property,
      second,
      { ...property, _id: 'invalid' },
      null,
    ]);
    expect(xml.split(`${origin}${propertyPath(property)}`).length - 1).toBe(1);
    expect(xml).not.toContain('invalid');
    const fetcher = vi.fn(async (url) => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: url.includes('page=2') ? [second] : [property],
          totalPages: 2,
        },
      }),
    }));
    const response = await seoResponse('/sitemap.xml', options(fetcher));
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(response.body).toContain(propertyPath(second));
  });
  it('fails closed for malformed sitemap pagination instead of serving partial discovery', async () => {
    for (const data of [
      { items: [], totalPages: '2' },
      { items: null, totalPages: 1 },
      { items: [], totalPages: 501 },
    ]) {
      const response = await seoResponse(
        '/sitemap.xml',
        options(async () => ({
          ok: true,
          json: async () => ({ success: true, data }),
        }))
      );
      expect(response.status).toBe(503);
      expect(response.headers['X-Robots-Tag']).toBe('noindex');
      expect(response.body).not.toContain('<urlset');
    }
  });
  it('does not read property data for preview sitemaps', async () => {
    const fetcher = vi.fn();
    const response = await seoResponse('/sitemap.xml', {
      ...options(fetcher),
      preview: true,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).not.toContain(property._id);
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
  });
  it('only shares build-owned editorial HTML at the edge', async () => {
    expect(
      (await seoResponse('/about', options(vi.fn()))).headers['Cache-Control']
    ).toContain('s-maxage=300');
    for (const path of ['/login', '/missing', '/properties?city=Noida']) {
      expect(
        (await seoResponse(path, options(vi.fn()))).headers['Cache-Control']
      ).toBe('no-store');
    }
    expect(
      (await seoResponse('/about', { ...options(vi.fn()), preview: true }))
        .headers['Cache-Control']
    ).toBe('no-store');
  });
  it('starts independent homepage reads together and excludes private stats', async () => {
    const pending = [];
    const fetcher = vi.fn(
      (url) => new Promise((resolve) => pending.push({ url, resolve }))
    );
    const work = seoResponse('/', options(fetcher));
    expect(fetcher).toHaveBeenCalledTimes(2);
    pending.forEach(({ url, resolve }) =>
      resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: url.endsWith('/stats')
            ? {
                totalRaised: 1,
                investors: 2,
                totalProperties: 3,
                token: 'private-stats',
              }
            : { items: [property], totalPages: 1 },
        }),
      })
    );
    const response = await work;
    expect(response.body).not.toContain('private-stats');
    expect(response.body).toContain('as="font"');
    expect(response.headers['Cache-Control']).toBe('no-store');
  });
  it('redirects the HTML entry URL without creating a duplicate homepage', async () => {
    const response = await seoResponse(
      '/index.html?utm_source=link',
      options(vi.fn())
    );
    expect(response.status).toBe(308);
    expect(response.headers.Location).toBe('/?utm_source=link');
  });
  it('permanently redirects legacy and stale property paths to one canonical slug', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data: property }),
    }));
    const response = await seoResponse(
      `/properties/${property._id}?ref=abc`,
      options(fetcher)
    );
    expect(response.status).toBe(301);
    expect(response.headers.Location).toBe(propertyPath(property));
    expect(fetcher.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
    });
  });
  it('returns real 404s and noindex for unknown or unavailable properties', async () => {
    const fetcher = async () => ({ ok: false, status: 404 });
    for (const url of [
      '/missing',
      '/insights/missing',
      '/real-estate-investment-in-missing',
      `/properties/missing-${property._id}`,
      '/properties/invalid',
    ]) {
      const response = await seoResponse(url, options(fetcher));
      expect(response.status).toBe(404);
      expect(response.headers['X-Robots-Tag']).toBe('noindex');
    }
  });
  it('returns retryable 503s instead of indexing an invented empty catalogue', async () => {
    const fetcher = async () => {
      throw new Error('Offline');
    };
    const response = await seoResponse('/properties', options(fetcher));
    expect(response.status).toBe(503);
    expect(response.headers['Retry-After']).toBe('60');
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
    expect((await seoResponse('/sitemap.xml', options(fetcher))).status).toBe(
      503
    );
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
    const response = await seoResponse('/fractional-real-estate', {
      ...options(vi.fn()),
      preview: true,
    });
    expect(response.headers['X-Robots-Tag']).toBe('noindex');
    expect(response.body).not.toContain('application/ld+json');
    expect(response.body).toContain('"preview":true');
    expect(
      (await seoResponse('/robots.txt', { ...options(vi.fn()), preview: true }))
        .body
    ).toContain('Disallow: /');
  });
});

describe('Truthful dynamic metadata', () => {
  it('uses actual type, location and integer-paise minimum without inventing absent values', () => {
    const meta = metadataFor(propertyPath(property), {
      property: { ...property, type: 'COMMERCIAL', state: 'Uttar Pradesh' },
      apiOrigin,
    });
    expect(meta.description).toContain(
      'Commercial property in Noida, Uttar Pradesh'
    );
    expect(meta.description).toContain('20,000');
    expect(meta.imageWidth).toBeUndefined();
    expect(meta.imageAlt).toContain('Aurelia <Residences>');
    const missing = metadataFor(propertyPath(property), {
      property: { ...property, unitPrice: undefined, images: [] },
    });
    expect(missing.description).not.toMatch(/Minimum|photos|guaranteed|ROI/);
    const overflow = metadataFor(propertyPath(property), {
      property: { ...property, unitPrice: Number.MAX_SAFE_INTEGER },
    });
    expect(overflow.description).not.toContain('Minimum');
  });
  it('rejects encoded private/signed social URLs', () => {
    for (const url of [
      'https://res.cloudinary.com/demo/image/%70rivate/a.jpg',
      'https://res.cloudinary.com/demo/image/upload/%73--secret--/a.jpg',
    ])
      expect(publicImageUrl(url)).toBeNull();
  });
  it('uses actual article dates/category and public organization attribution', () => {
    const article = publishedArticles()[0];
    const meta = metadataFor(`/insights/${article.slug}`);
    const head = headMarkup(meta);
    expect(head).toContain('article:published_time');
    expect(head).toContain('twitter:image:alt');
    expect(
      meta.structured.find((item) => item['@type'] === 'Article').articleSection
    ).toBe(article.category);
    expect(
      metadataFor('/about').structured.some(
        (item) => item['@type'] === 'Organization'
      )
    ).toBe(true);
    expect(metadataFor(`/insights/${article.slug}`, { status: 503 }).type).toBe(
      'website'
    );
  });
});
