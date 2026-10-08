export const DEFAULT_SITE_URL = 'https://estora-pi.vercel.app';
export const PUBLIC_PROPERTY_STATUSES = ['LIVE', 'FUNDED'];

export function siteOrigin(value = DEFAULT_SITE_URL) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error(
      'SEO_SITE_URL must be an HTTPS origin without credentials.'
    );
  return url.origin;
}

export function propertyId(value = '') {
  return (
    String(value)
      .match(/(?:^|-)([a-f\d]{24})$/i)?.[1]
      .toLowerCase() || null
  );
}

export function propertyPath(property) {
  const id = propertyId(property?._id);
  if (!id)
    return `/properties/${encodeURIComponent(String(property?._id || ''))}`;
  const name =
    [property.title, property.city]
      .filter(Boolean)
      .join(' ')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z\d]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100)
      .replace(/-+$/, '') || 'property';
  return `/properties/${name}-${id}`;
}

// Only images attached to published records reach SSR. Never use signed or
// credential-bearing URLs in social metadata or serialized public state.
export function publicImageUrl(media, apiOrigin, origin = DEFAULT_SITE_URL) {
  const raw = typeof media === 'string' ? media : media?.url;
  if (!raw) return null;
  if (/^\/api\/v1\/media\/[a-f\d]{24}$/i.test(raw))
    return `${apiOrigin.replace(/\/$/, '')}${raw}`;
  if (/^\/assets\/[a-z\d/_\-.]+$/i.test(raw)) return `${origin}${raw}`;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const path = decodeURIComponent(url.pathname);
    if (
      /\/(?:authenticated|private)\//i.test(path) ||
      /\/s--[^/]+--\//.test(path)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function canonicalPath(pathname) {
  const decoded = pathname.replace(/%([a-f\d]{2})/gi, (encoded, hex) => {
    const character = String.fromCharCode(parseInt(hex, 16));
    return /[a-z\d._~-]/i.test(character) ? character : encoded;
  });
  const path = decoded.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const root = path.split('/')[1]?.toLowerCase();
  // Public routes are lowercase. Never rewrite case-sensitive recovery tokens.
  return [
    'properties',
    'insights',
    'calculators',
    'fractional-real-estate',
    'about',
    'robots.txt',
    'sitemap.xml',
    'index.html',
  ].includes(root) || root?.startsWith('real-estate-investment-in-')
    ? path.toLowerCase()
    : path;
}
