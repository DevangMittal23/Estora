import { articles } from './articles';
import { cities } from './cities';
import { DEFAULT_SITE_URL, siteOrigin, propertyPath, publicImageUrl, PUBLIC_PROPERTY_STATUSES, canonicalPath } from './urls';

export const publicPages = {
  '/': ['Estora — Fractional Real Estate Investment in India', 'Explore fractional property ownership with Estora. Compare listings, understand units and track the funding-to-sale process in an academic demonstration.'],
  '/properties': ['Fractional Property Investment Opportunities | Estora', 'Explore published Estora property listings in India. Compare locations, unit prices, funding status and the available property information.'],
  '/fractional-real-estate': ['How Fractional Real Estate Ownership Works | Estora', 'Understand proportional property units, funding and sale proceeds, indicative projections and the scope of Estora’s fractional ownership demonstration.'],
  '/about': ['About Estora | Fractional Real Estate Platform', 'Learn about Estora’s academic real estate investment platform for India, its funding-to-sale model and its use of test funds and dummy identity documents.'],
  '/insights': ['Property Ownership Guides and Insights | Estora', 'Read Estora’s practical guides to property listing information, proportional ownership and the assumptions behind real estate calculations.'],
  '/calculators': ['Real Estate Calculators: ROI and Rental Yield | Estora', 'Explore educational real estate calculators with transparent formulas. Use your own costs, proceeds and rental assumptions without logging in.'],
  '/calculators/real-estate-roi': ['Real Estate ROI Calculator | Estora', 'Calculate an illustrative real estate return on investment using your own costs, sale proceeds and income. Review the formula, assumptions and limitations.'],
  '/calculators/rental-yield': ['Rental Yield Calculator: Gross and Net | Estora', 'Calculate gross and net rental yield using your own property price, annual rent and expenses. Understand the formula and its limits.'],
};
const privateTitles = {
  login: 'Log in', signup: 'Create an account', 'forgot-password': 'Password recovery',
  reset: 'Reset password', 'reset-password': 'Reset password', investor: 'Investor workspace',
  broker: 'Broker workspace', admin: 'Admin workspace', profile: 'My profile', notifications: 'Notifications',
};
for (const city of cities) publicPages[`/real-estate-investment-in-${city.slug}`] = [
  `Real Estate Investment in ${city.name} | Estora`,
  `Explore published Estora property opportunities in ${city.name}. Review available unit prices, funding status, location information and investment considerations.`,
];
export const isPrivatePath = (path) => /^\/(?:login|signup|forgot-password|reset|reset-password|investor|broker|admin|profile|notifications)(?:\/|$)/.test(path);
export const publishedArticles = () => articles.filter((article) => article.published === true);
export function articleForPath(path) {
  return publishedArticles().find((article) => `/insights/${article.slug}` === path);
}
export function isPublicPath(path) {
  return !!publicPages[canonicalPath(path)] || !!articleForPath(canonicalPath(path)) || /^\/properties\/[^/]+$/.test(path);
}

export function metadataFor(pathname, { property, status = 200, query = '', origin = DEFAULT_SITE_URL, apiOrigin = '' } = {}) {
  const site = siteOrigin(origin);
  const path = canonicalPath(pathname);
  const article = articleForPath(path);
  const published = property && PUBLIC_PROPERTY_STATUSES.includes(property.status);
  const propertyPage = /^\/properties\/[^/]+$/.test(path);
  const entry = publicPages[path];
  let title = entry?.[0];
  let description = entry?.[1];
  let canonical = entry || article ? `${site}${path === '/' ? '' : path}` : null;
  let indexable = !!entry || !!article;
  let image = `${site}/assets/estora-residences.webp`;
  if (propertyPage && published) {
    title = `${property.title} | Fractional Property Investment | Estora`;
    description = `Explore ${property.title}${property.city ? ` in ${property.city}` : ''}. Review its property details, unit-based investment structure and ${property.status.toLowerCase()} funding status.`;
    canonical = `${site}${propertyPath(property)}`;
    image = publicImageUrl(property.images?.[0], apiOrigin, site) || image;
    indexable = true;
  } else if (article) {
    title = `${article.title} | Estora Insights`;
    description = article.description;
    image = publicImageUrl(article.heroImage, apiOrigin, site) || image;
  }
  if (isPrivatePath(path)) {
    title = `${privateTitles[path.split('/')[1]] || 'Account'} | Estora`;
    description = 'Sign in to access your Estora account. This application page is not part of the public property catalogue.';
    indexable = false;
    canonical = null;
  }
  if (status !== 200 || !title) {
    title = status === 503 ? 'Property information temporarily unavailable | Estora' : 'Page not found | Estora';
    description = status === 503 ? 'Property information is temporarily unavailable. Please try again shortly.' : 'This page is unavailable. Explore Estora’s property marketplace or return to the homepage.';
    indexable = false;
    canonical = null;
  }
  const params = new URLSearchParams(query);
  if (path === '/properties' && [...params.keys()].some((key) => !/^(utm_.+|ref|gclid|fbclid)$/.test(key))) indexable = false;
  const robots = indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow';
  const structured = [];
  const organization = { '@type': 'Organization', '@id': `${site}/#organization`, name: 'Estora', url: site, logo: `${site}/assets/estora-mark.svg` };
  if (path === '/' && indexable) {
    structured.push({ '@context': 'https://schema.org', ...organization });
    structured.push({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${site}/#website`, name: 'Estora', url: site, inLanguage: 'en-IN', publisher: { '@id': organization['@id'] } });
  }
  if (indexable && path !== '/') {
    const crumbs = [{ name: 'Estora', item: site }];
    if (propertyPage) crumbs.push({ name: 'Properties', item: `${site}/properties` });
    else if (article) crumbs.push({ name: 'Insights', item: `${site}/insights` });
    else if (path.startsWith('/calculators/')) crumbs.push({ name: 'Calculators', item: `${site}/calculators` });
    const labels = { '/properties': 'Properties', '/fractional-real-estate': 'Fractional real estate', '/about': 'About ESTORA', '/insights': 'Insights', '/calculators': 'Calculators', '/calculators/real-estate-roi': 'Real estate ROI calculator', '/calculators/rental-yield': 'Rental yield calculator' };
    const city = cities.find((entry) => path === `/real-estate-investment-in-${entry.slug}`);
    crumbs.push({ name: property?.title || article?.title || labels[path] || (city && `Real estate investment in ${city.name}`), item: canonical });
    structured.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })) });
  }
  if (article && indexable) structured.push({ '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, image, author: { '@type': article.author.type, name: article.author.name }, publisher: organization, datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: canonical, inLanguage: 'en-IN' });
  return { title, description, canonical, robots, image, type: article ? 'article' : 'website', structured, indexable };
}

export const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function headMarkup(meta) {
  const tag = (name, content, attribute = 'name') => `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`;
  return `<title>${escapeHtml(meta.title)}</title>${tag('description', meta.description)}${tag('robots', meta.robots)}${meta.canonical ? `<link rel="canonical" href="${escapeHtml(meta.canonical)}">` : ''}${tag('og:title', meta.title, 'property')}${tag('og:description', meta.description, 'property')}${tag('og:type', meta.type, 'property')}${tag('og:site_name', 'Estora', 'property')}${tag('og:locale', 'en_IN', 'property')}${meta.canonical ? tag('og:url', meta.canonical, 'property') : ''}${tag('og:image', meta.image, 'property')}${tag('og:image:alt', 'Estora real estate property imagery', 'property')}${tag('twitter:card', 'summary_large_image')}${tag('twitter:title', meta.title)}${tag('twitter:description', meta.description)}${tag('twitter:image', meta.image)}${meta.structured.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join('')}`;
}
