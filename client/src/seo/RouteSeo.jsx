import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../api';
import { metadataFor, metadataTags, safeJson } from './metadata';
import { propertyId } from './urls';

function applyMetadata(meta) {
  document.title = meta.title;
  document.documentElement.lang = 'en-IN';
  const update = (selector, attributes) => {
    let element = document.head.querySelector(selector);
    if (!element) {
      element = document.createElement(
        selector.startsWith('link') ? 'link' : 'meta'
      );
      document.head.appendChild(element);
    }
    for (const [key, value] of Object.entries(attributes))
      element.setAttribute(key, value);
  };
  if (meta.canonical)
    update('link[rel="canonical"]', { rel: 'canonical', href: meta.canonical });
  else document.head.querySelector('link[rel="canonical"]')?.remove();
  for (const [attribute, name, content] of metadataTags(meta)) {
    const selector = `meta[${attribute}="${name}"]`;
    if (content !== undefined && content !== null)
      update(selector, { [attribute]: name, content });
    else document.head.querySelector(selector)?.remove();
  }
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((element) => element.remove());
  for (const data of meta.structured) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = safeJson(data);
    document.head.appendChild(script);
  }
}

function Metadata({ property, status }) {
  const location = useLocation();
  useEffect(() => {
    const origin =
      window.__ESTORA_PUBLIC__?.origin || import.meta.env.VITE_SITE_URL;
    const initial = window.__ESTORA_PUBLIC__;
    const documentStatus =
      initial?.pathname === location.pathname && initial.status >= 400
        ? initial.status
        : status;
    const meta = metadataFor(location.pathname, {
      property,
      status: documentStatus,
      query: location.search,
      origin,
      apiOrigin: import.meta.env.VITE_API_URL,
    });
    if (
      window.__ESTORA_PUBLIC__?.preview ||
      import.meta.env.VITE_SEO_PREVIEW === 'true'
    ) {
      meta.robots = 'noindex, follow';
      meta.structured = [];
    }
    applyMetadata(meta);
  }, [location.pathname, location.search, property, status]);
  return null;
}

function PropertyMetadata({ id }) {
  const query = useData(`/properties/${id}`, {}, { enabled: !!id });
  return (
    <Metadata
      property={query.data}
      status={
        query.isError
          ? query.error?.response?.status === 404 ||
            query.error?.response?.status === 403
            ? 404
            : 503
          : !id
            ? 404
            : query.data
              ? 200
              : 202
      }
    />
  );
}
export function RouteSeo() {
  const { pathname } = useLocation();
  const match = /^\/properties\/([^/]+)$/.exec(pathname);
  return match ? (
    <PropertyMetadata id={propertyId(match[1])} />
  ) : (
    <Metadata status={pathname === '/forbidden' ? 403 : 200} />
  );
}
