import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../api';
import { metadataFor, safeJson } from './metadata';
import { propertyId } from './urls';

function applyMetadata(meta) {
  document.title = meta.title;
  document.documentElement.lang = 'en-IN';
  const update = (selector, attributes) => {
    let element = document.head.querySelector(selector);
    if (!element) { element = document.createElement(selector.startsWith('link') ? 'link' : 'meta'); document.head.appendChild(element); }
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  };
  update('meta[name="description"]', { name: 'description', content: meta.description });
  update('meta[name="robots"]', { name: 'robots', content: meta.robots });
  if (meta.canonical) update('link[rel="canonical"]', { rel: 'canonical', href: meta.canonical });
  else document.head.querySelector('link[rel="canonical"]')?.remove();
  for (const [name, content] of Object.entries({ 'og:title': meta.title, 'og:description': meta.description, 'og:type': meta.type, 'og:image': meta.image, 'og:site_name': 'Estora', 'og:locale': 'en_IN', 'og:url': meta.canonical })) {
    if (content) update(`meta[property="${name}"]`, { property: name, content });
    else document.head.querySelector(`meta[property="${name}"]`)?.remove();
  }
  for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': meta.title, 'twitter:description': meta.description, 'twitter:image': meta.image })) update(`meta[name="${name}"]`, { name, content });
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((element) => element.remove());
  for (const data of meta.structured) { const script = document.createElement('script'); script.type = 'application/ld+json'; script.textContent = safeJson(data); document.head.appendChild(script); }
}

function Metadata({ property, status }) {
  const location = useLocation();
  useEffect(() => {
    const origin = window.__ESTORA_PUBLIC__?.origin || import.meta.env.VITE_SITE_URL;
    const meta = metadataFor(location.pathname, { property, status, query: location.search, origin, apiOrigin: import.meta.env.VITE_API_URL });
    if (window.__ESTORA_PUBLIC__?.preview || import.meta.env.VITE_SEO_PREVIEW === 'true') { meta.robots = 'noindex, follow'; meta.structured = []; }
    applyMetadata(meta);
  }, [location.pathname, location.search, property, status]);
  return null;
}

function PropertyMetadata({ id }) {
  const query = useData(`/properties/${id}`, {}, { enabled: !!id });
  return <Metadata property={query.data} status={query.isError ? (query.error?.response?.status === 404 || query.error?.response?.status === 403 ? 404 : 503) : id ? 200 : 404} />;
}
export function RouteSeo() {
  const { pathname } = useLocation();
  const match = /^\/properties\/([^/]+)$/.exec(pathname);
  return match ? <PropertyMetadata id={propertyId(match[1])} /> : <Metadata status={pathname === '/forbidden' ? 403 : 200} />;
}
