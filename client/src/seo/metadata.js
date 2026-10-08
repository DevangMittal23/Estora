import { articles } from './articles';
import { cities } from './cities';
import { label, money } from '../utils';
import {
  DEFAULT_SITE_URL,
  siteOrigin,
  propertyPath,
  publicImageUrl,
  PUBLIC_PROPERTY_STATUSES,
  canonicalPath,
} from './urls';

export const publicPages = {
  '/': [
    'Estora — Fractional Real Estate Investing in India',
    'Explore property listings, understand fractional ownership and use free investment calculators. Discover Estora’s academic platform with test funds.',
  ],
  '/properties': [
    'Browse Fractional Property Listings in India | Estora',
    'Compare published properties by location, unit price, minimum commitment and funding progress. Explore each listing’s photos and investment structure.',
  ],
  '/fractional-real-estate': [
    'Fractional Real Estate: Ownership, Units & Risks | Estora',
    'Learn how property units and proportional ownership work, with an illustrative example, risks, due diligence questions and comparisons with full ownership and REITs.',
  ],
  '/about': [
    'About Estora: Making Property Ownership Clearer',
    'Discover Estora’s academic property platform, its funding-to-sale workflow and the roles behind it. Understand the boundaries of its test-funds demonstration.',
  ],
  '/insights': [
    'Estora Insights: Property Guides & Investment Calculations',
    'Read practical guides to evaluating property listings, understanding ROI assumptions and distinguishing gross rental yield from the costs behind it.',
  ],
  '/calculators': [
    'Property Investment Calculators: ROI & Rental Yield | Estora',
    'Choose a free ROI or rental yield calculator. Explore your own costs and proceeds, understand the formulas and review the limits without creating an account.',
  ],
  '/calculators/real-estate-roi': [
    'Real Estate ROI Calculator: Costs & Sale Proceeds | Estora',
    'Estimate total gain, ROI and an annualized scenario using your investment, sale proceeds, income, expenses and holding period. No login or promised returns.',
  ],
  '/calculators/rental-yield': [
    'Rental Yield Calculator: Gross & Net Yield | Estora',
    'Calculate gross and net rental yield from property value, monthly or annual rent and expenses. Review assumptions, including vacancy and negative net yield.',
  ],
};
const privateTitles = {
  login: 'Log in',
  signup: 'Create an account',
  'forgot-password': 'Password recovery',
  reset: 'Reset password',
  'reset-password': 'Reset password',
  investor: 'Investor workspace',
  broker: 'Broker workspace',
  admin: 'Admin workspace',
  profile: 'My profile',
  notifications: 'Notifications',
};
for (const city of cities)
  publicPages[`/real-estate-investment-in-${city.slug}`] = [
    `${city.name} Property Investment: Listings & Guide | Estora`,
    `Learn what to check when evaluating property in ${city.name}, from location and records to unit costs and exit risks. Explore published Estora opportunities when available.`,
  ];
export const isPrivatePath = (path) =>
  /^\/(?:login|signup|forgot-password|reset|reset-password|investor|broker|admin|profile|notifications)(?:\/|$)/i.test(
    path
  );
export const publishedArticles = () =>
  articles.filter((article) => article.published === true);
export function articleForPath(path) {
  return publishedArticles().find(
    (article) => `/insights/${article.slug}` === path
  );
}
export function isPublicPath(path) {
  return (
    !!publicPages[canonicalPath(path)] ||
    !!articleForPath(canonicalPath(path)) ||
    /^\/properties\/[^/]+$/.test(path)
  );
}

export function metadataFor(
  pathname,
  {
    property,
    status = 200,
    query = '',
    origin = DEFAULT_SITE_URL,
    apiOrigin = '',
  } = {}
) {
  const site = siteOrigin(origin);
  const path = canonicalPath(pathname);
  const article = articleForPath(path);
  const published =
    property && PUBLIC_PROPERTY_STATUSES.includes(property.status);
  const propertyPage = /^\/properties\/[^/]+$/.test(path);
  const entry = publicPages[path];
  let title = entry?.[0];
  let description = entry?.[1];
  let canonical =
    entry || article ? `${site}${path === '/' ? '' : path}` : null;
  let indexable = !!entry || !!article;
  let image = `${site}/assets/estora-residences.webp`;
  let imageAlt = 'Illustrative contemporary residences with landscaped gardens';
  let imageWidth = 1672,
    imageHeight = 941;
  if (propertyPage && published) {
    const name = String(property.title).replace(/\s+/g, ' ').trim();
    const location = [property.city, property.state].filter(Boolean).join(', ');
    title = `${name}${property.city && !name.toLowerCase().includes(property.city.toLowerCase()) ? ` in ${property.city}` : ''} | Estora`;
    let minimum = '';
    if (
      Number.isSafeInteger(property.unitPrice) &&
      property.unitPrice > 0 &&
      Number.isSafeInteger(property.minUnits) &&
      property.minUnits > 0
    ) {
      const paise = BigInt(property.unitPrice) * BigInt(property.minUnits);
      if (paise <= BigInt(Number.MAX_SAFE_INTEGER))
        minimum = ` Minimum unit commitment ${money(Number(paise))}.`;
    }
    canonical = `${site}${propertyPath(property)}`;
    const propertyImage = property.images
      ?.map((media) => publicImageUrl(media, apiOrigin, site))
      .find(Boolean);
    description = `${property.type ? `${label(property.type)} property` : name}${location ? ` in ${location}` : ''}.${minimum} ${propertyImage ? 'View photos and review' : 'Review'} ${property.status === 'FUNDED' ? 'completed funding' : 'funding progress'} and the unit investment structure.`;
    if (propertyImage) {
      image = propertyImage;
      imageAlt = `${name}${location ? ` in ${location}` : ''}`;
      imageWidth = undefined;
      imageHeight = undefined;
    }
    indexable = true;
  } else if (article) {
    title = `${article.title} | Estora Insights`;
    description = article.description;
    image = publicImageUrl(article.heroImage, apiOrigin, site) || image;
  }
  if (isPrivatePath(path)) {
    title = `${privateTitles[path.split('/')[1].toLowerCase()] || 'Account'} | Estora`;
    description =
      'Sign in to access your Estora account. This application page is not part of the public property catalogue.';
    indexable = false;
    canonical = null;
  }
  if (status !== 200 || !title) {
    title =
      status === 503
        ? 'Property information temporarily unavailable | Estora'
        : status === 202
          ? 'Loading property information | Estora'
          : status === 403
            ? 'Access restricted | Estora'
            : 'Page not found | Estora';
    description =
      status === 503
        ? 'Property information is temporarily unavailable. Please try again shortly.'
        : status === 202
          ? 'The property information is loading. Please wait for the current listing details.'
          : 'This page is unavailable. Explore Estora’s property marketplace or return to the homepage.';
    indexable = false;
    canonical = null;
  }
  const params = new URLSearchParams(query);
  if (
    path === '/properties' &&
    [...params.keys()].some((key) => !/^(utm_.+|ref|gclid|fbclid)$/.test(key))
  )
    indexable = false;
  const robots = indexable
    ? 'index, follow, max-image-preview:large'
    : 'noindex, follow';
  const structured = [];
  const organization = {
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: 'Estora',
    url: site,
    logo: `${site}/assets/estora-mark.svg`,
  };
  if (['/', '/about'].includes(path) && indexable) {
    structured.push({ '@context': 'https://schema.org', ...organization });
    if (path === '/')
      structured.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        name: 'Estora',
        url: site,
        inLanguage: 'en-IN',
        publisher: { '@id': organization['@id'] },
      });
  }
  if (indexable && path !== '/') {
    const crumbs = [{ name: propertyPage ? 'Estora' : 'Home', item: site }];
    if (propertyPage)
      crumbs.push({ name: 'Properties', item: `${site}/properties` });
    else if (article)
      crumbs.push({ name: 'Insights', item: `${site}/insights` });
    else if (path.startsWith('/calculators/'))
      crumbs.push({ name: 'Calculators', item: `${site}/calculators` });
    const labels = {
      '/properties': 'Properties',
      '/fractional-real-estate': 'Fractional real estate',
      '/about': 'About ESTORA',
      '/insights': 'Insights',
      '/calculators': 'Calculators',
      '/calculators/real-estate-roi': 'Real estate ROI calculator',
      '/calculators/rental-yield': 'Rental yield calculator',
    };
    const city = cities.find(
      (entry) => path === `/real-estate-investment-in-${entry.slug}`
    );
    crumbs.push({
      name:
        property?.title ||
        article?.title ||
        labels[path] ||
        (city && `Real estate investment in ${city.name}`),
      item: canonical,
    });
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...crumb,
      })),
    });
  }
  if (article && indexable)
    structured.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${canonical}#article`,
      headline: article.title,
      description: article.description,
      image,
      author: {
        '@type': article.author.type,
        name: article.author.name,
        url: `${site}/about`,
      },
      publisher: organization,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      articleSection: article.category,
      mainEntityOfPage: canonical,
      inLanguage: 'en-IN',
    });
  return {
    title,
    description,
    canonical,
    robots,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    type: article && status === 200 ? 'article' : 'website',
    article: article && status === 200 ? article : null,
    structured,
    indexable,
  };
}

export const safeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]
  );
export function metadataTags(meta) {
  return [
    ['name', 'description', meta.description],
    ['name', 'robots', meta.robots],
    ...Object.entries({
      'og:title': meta.title,
      'og:description': meta.description,
      'og:type': meta.type,
      'og:site_name': 'Estora',
      'og:locale': 'en_IN',
      'og:url': meta.canonical,
      'og:image': meta.image,
      'og:image:alt': meta.imageAlt,
      'og:image:width': meta.imageWidth,
      'og:image:height': meta.imageHeight,
      'article:published_time': meta.article?.publishedAt,
      'article:modified_time': meta.article?.updatedAt,
      'article:section': meta.article?.category,
    }).map(([name, content]) => ['property', name, content]),
    ...Object.entries({
      'twitter:card': 'summary_large_image',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
      'twitter:image': meta.image,
      'twitter:image:alt': meta.imageAlt,
    }).map(([name, content]) => ['name', name, content]),
  ];
}
export function headMarkup(meta) {
  const tags = metadataTags(meta)
    .filter(([, , content]) => content !== undefined && content !== null)
    .map(
      ([attribute, name, content]) =>
        `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`
    )
    .join('');
  return `<title>${escapeHtml(meta.title)}</title>${tags}${meta.canonical ? `<link rel="canonical" href="${escapeHtml(meta.canonical)}">` : ''}${meta.structured.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join('')}`;
}
