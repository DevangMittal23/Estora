import {
  publicPages,
  publishedArticles,
  articleForPath,
  metadataFor,
  headMarkup,
  safeJson,
  isPrivatePath,
} from './metadata';
import {
  DEFAULT_SITE_URL,
  siteOrigin,
  propertyId,
  propertyPath,
  PUBLIC_PROPERTY_STATUSES,
  publicImageUrl,
  canonicalPath,
} from './urls';
import { cities } from './cities';

const propertyFields = [
  '_id',
  'title',
  'description',
  'type',
  'address',
  'city',
  'state',
  'pincode',
  'geo',
  'areaSqft',
  'valuation',
  'totalUnits',
  'unitPrice',
  'minUnits',
  'unitsSold',
  'expectedAppreciationPct',
  'rentalYieldPct',
  'holdingPeriodMonths',
  'status',
  'updatedAt',
  'liveAt',
  'fundedAt',
  'investorCount',
];
export function publicProperty(record, apiOrigin, origin) {
  if (
    !record ||
    !PUBLIC_PROPERTY_STATUSES.includes(record.status) ||
    !propertyId(record._id)
  )
    return null;
  const clean = Object.fromEntries(
    propertyFields
      .filter((key) => record[key] !== undefined)
      .map((key) => [key, record[key]])
  );
  clean.images = (record.images || []).flatMap((media) => {
    const url = publicImageUrl(media, apiOrigin, origin);
    return url
      ? [{ url, name: typeof media.name === 'string' ? media.name : undefined }]
      : [];
  });
  clean.fundingPct = record.totalUnits
    ? (record.unitsSold / record.totalUnits) * 100
    : 0;
  clean.seoPublic = true;
  return clean;
}

const xmlEscape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]
  );
export function sitemapXml(properties, origin = DEFAULT_SITE_URL) {
  const site = siteOrigin(origin);
  const published = [
    ...new Map(
      properties
        .filter(
          (p) =>
            p &&
            propertyId(p._id) &&
            PUBLIC_PROPERTY_STATUSES.includes(p.status)
        )
        .map((p) => [propertyId(p._id), p])
    ).values(),
  ];
  const records = [
    ...Object.keys(publicPages).map((path) => ({ path })),
    ...publishedArticles().map((article) => ({
      path: `/insights/${article.slug}`,
      updated: article.updatedAt,
    })),
    ...published.map((property) => ({
      path: propertyPath(property),
      updated: property.updatedAt,
    })),
  ];
  if (records.length > 50000)
    throw new Error(
      'Sitemap exceeds 50,000 URLs; split into a sitemap index before publishing.'
    );
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${records.map(({ path, updated }) => `<url><loc>${xmlEscape(`${site}${path === '/' ? '' : path}`)}</loc>${updated && Number.isFinite(Date.parse(updated)) ? `<lastmod>${new Date(updated).toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}

export function robotsTxt(origin = DEFAULT_SITE_URL) {
  // Public sign-in/recovery entry pages must be crawlable to observe noindex.
  return `User-agent: *\nAllow: /\n${['admin', 'broker', 'investor', 'profile', 'notifications', 'reset', 'reset-password', 'forbidden', 'api'].map((path) => `Disallow: /${path}$\nDisallow: /${path}/`).join('\n')}\n\nSitemap: ${siteOrigin(origin)}/sitemap.xml\n`;
}

export async function seoResponse(
  requestUrl,
  {
    template,
    render,
    origin = DEFAULT_SITE_URL,
    apiOrigin,
    fetcher = fetch,
    preview = false,
  }
) {
  const site = siteOrigin(origin);
  const url = new URL(
    requestUrl.startsWith('/') ? `${site}${requestUrl}` : requestUrl,
    site
  );
  const path = canonicalPath(url.pathname);
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Accept-Encoding',
  };
  if (path === '/index.html')
    return {
      status: 308,
      headers: { ...headers, Location: `/${url.search}` },
      body: '',
    };
  const get = async (endpoint) => {
    const response = await fetcher(
      `${apiOrigin.replace(/\/$/, '')}/api/v1${endpoint}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) {
      const error = new Error('Public property data unavailable');
      error.status = response.status;
      throw error;
    }
    const body = await response.json();
    if (!body.success || !body.data) throw new Error('Invalid public response');
    return body.data;
  };
  if (url.pathname !== path && path !== '/index.html')
    return {
      status: 308,
      headers: { ...headers, Location: `${path}${url.search}` },
      body: '',
    };
  if (path === '/robots.txt')
    return {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': preview
          ? 'no-store'
          : 'public, max-age=0, s-maxage=300',
      },
      body: preview ? 'User-agent: *\nDisallow: /\n' : robotsTxt(site),
    };
  if (path === '/sitemap.xml') {
    if (preview)
      return {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/xml; charset=utf-8',
          'X-Robots-Tag': 'noindex',
        },
        body: sitemapXml([], site),
      };
    try {
      const properties = [];
      let page = 1,
        totalPages = 1;
      do {
        const data = await get(`/seo/properties?page=${page}&limit=100`);
        if (
          !Array.isArray(data.items) ||
          !Number.isSafeInteger(data.totalPages) ||
          data.totalPages < 0
        )
          throw new Error('Invalid sitemap pagination');
        properties.push(
          ...data.items
            .map((property) => publicProperty(property, apiOrigin, site))
            .filter(Boolean)
        );
        totalPages = data.totalPages;
        if (properties.length > 50000 || totalPages > 500)
          throw new Error('Sitemap index required');
        page++;
      } while (page <= totalPages);
      return {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/xml; charset=utf-8',
          'X-Robots-Tag': 'all',
        },
        body: sitemapXml(properties, site),
      };
    } catch {
      return {
        status: 503,
        headers: {
          ...headers,
          'Retry-After': '60',
          'X-Robots-Tag': 'noindex',
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: 'Sitemap temporarily unavailable. Please try again shortly.',
      };
    }
  }
  let status = 200,
    property,
    entries = [];
  const detail = /^\/properties\/([^/]+)$/.exec(path);
  const city = cities.find(
    (entry) => path === `/real-estate-investment-in-${entry.slug}`
  );
  const privatePage = isPrivatePath(path);
  if (detail) {
    const id = propertyId(detail[1]);
    if (!id) status = 404;
    else
      try {
        property = publicProperty(
          await get(`/seo/properties/${id}`),
          apiOrigin,
          site
        );
        if (!property) status = 404;
        else if (path !== propertyPath(property))
          return {
            status: 301,
            headers: { ...headers, Location: propertyPath(property) },
            body: '',
          };
        else
          entries.push({
            path: `/properties/${id}`,
            params: {},
            data: property,
          });
      } catch (error) {
        status = [400, 403, 404].includes(error.status) ? 404 : 503;
      }
  } else if (city) {
    try {
      const data = await get(
        `/seo/properties?city=${encodeURIComponent(city.name)}&page=1&limit=9`
      );
      entries.push({
        path: '/seo/properties',
        params: { city: city.name, page: 1, limit: 9 },
        data: {
          ...data,
          items: data.items
            .map((record) => publicProperty(record, apiOrigin, site))
            .filter(Boolean),
        },
      });
    } catch {
      status = 503;
    }
  } else if (path === '/' || path === '/properties') {
    // These public reads are independent; no financial transaction is involved.
    const [catalogue, statistics] = await Promise.allSettled([
      get(
        `/seo/properties?page=1&limit=${path === '/' ? 3 : 9}&sort=-createdAt${path === '/' ? '&status=LIVE' : ''}`
      ),
      path === '/' ? get('/stats') : Promise.resolve(null),
    ]);
    try {
      if (catalogue.status === 'rejected') throw catalogue.reason;
      const data = catalogue.value;
      const params =
        path === '/'
          ? { status: 'LIVE', limit: 3 }
          : { page: 1, limit: 9, sort: '-createdAt' };
      // The home feature list shows LIVE properties, not funded opportunities.
      const items = data.items
        .map((record) => publicProperty(record, apiOrigin, site))
        .filter(Boolean)
        .filter((record) => path !== '/' || record.status === 'LIVE');
      entries.push({ path: '/properties', params, data: { ...data, items } });
    } catch {
      if (path === '/properties') status = 503;
    }
    if (path === '/' && statistics.status === 'fulfilled' && statistics.value) {
      const stats = statistics.value;
      entries.push({
        path: '/stats',
        params: {},
        data: {
          totalRaised: stats.totalRaised,
          investors: stats.investors,
          totalProperties: stats.totalProperties,
        },
      });
    }
  } else if (!privatePage && !publicPages[path] && !articleForPath(path))
    status = path === '/forbidden' ? 403 : 404;
  const meta = metadataFor(path, {
    property,
    status,
    query: url.search,
    origin: site,
    apiOrigin,
  });
  if (preview) {
    meta.robots = 'noindex, follow';
    meta.indexable = false;
    meta.structured = [];
  }
  if (!meta.indexable) headers['X-Robots-Tag'] = 'noindex';
  if (status === 503) headers['Retry-After'] = '60';
  const editorial =
    (publicPages[path] || articleForPath(path)) &&
    !city &&
    path !== '/' &&
    path !== '/properties';
  if (
    status === 200 &&
    meta.indexable &&
    !privatePage &&
    !preview &&
    editorial
  ) {
    // Only non-personalized, build-owned editorial HTML is shared at the edge.
    headers['Cache-Control'] =
      'public, max-age=0, s-maxage=300, stale-while-revalidate=300';
  }
  const rendered = !privatePage;
  const body = rendered ? await render(path, entries, status) : '';
  const state = {
    entries,
    status,
    ...(privatePage ? {} : { pathname: path }),
    rendered,
    origin: site,
    preview,
  };
  const head =
    headMarkup(meta) +
    (path === '/'
      ? '<link rel="preload" as="image" href="/assets/estora-residences.webp" fetchpriority="high"><link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-600-latin.woff2" crossorigin="anonymous"><link rel="preload" as="font" type="font/woff2" href="/assets/fonts/cormorant-garamond-600-italic-latin.woff2" crossorigin="anonymous">'
      : '');
  return {
    status,
    headers,
    body: template
      .replace('<!--seo-head-->', head)
      .replace('<!--seo-outlet-->', body)
      .replace(
        '<!--seo-state-->',
        `<script id="estora-public-state" type="application/json">${safeJson(state)}</script>`
      ),
  };
}
