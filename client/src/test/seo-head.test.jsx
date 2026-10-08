import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RouteSeo } from '../seo/RouteSeo';
import { publishedArticles } from '../seo/metadata';

const { query } = vi.hoisted(() => ({
  query: { data: undefined, isError: false },
}));
vi.mock('../api', () => ({ useData: () => query }));
const tag = (name) =>
  document.head.querySelector(`meta[property="${name}"],meta[name="${name}"]`);
function Navigate({ to }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>Next page</button>;
}
function mount(path, to = '/properties') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteSeo />
      <Navigate to={to} />
    </MemoryRouter>
  );
}
afterEach(() => {
  delete window.__ESTORA_PUBLIC__;
  query.data = undefined;
  query.isError = false;
  document.head
    .querySelectorAll(
      'meta,link[rel="canonical"],script[type="application/ld+json"]'
    )
    .forEach((node) => node.remove());
});

describe('Metadata across application navigation', () => {
  it('removes article-only metadata when visiting the marketplace', () => {
    const view = mount(`/insights/${publishedArticles()[0].slug}`);
    expect(tag('article:published_time')).not.toBeNull();
    expect(tag('og:type').content).toBe('article');
    fireEvent.click(view.getByText('Next page'));
    expect(tag('article:published_time')).toBeNull();
    expect(tag('article:section')).toBeNull();
    expect(tag('og:type').content).toBe('website');
    expect(tag('twitter:image:alt').content).toBe(tag('og:image:alt').content);
  });
  it('removes public canonical and schema on private navigation', () => {
    const view = mount('/about', '/login');
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull();
    fireEvent.click(view.getByText('Next page'));
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(tag('og:url')).toBeNull();
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
    ).toBeNull();
    expect(tag('robots').content).toContain('noindex');
  });
  it('keeps preview noindex after leaving a private page', () => {
    window.__ESTORA_PUBLIC__ = {
      origin: 'https://estora-pi.vercel.app',
      preview: true,
    };
    const view = mount('/login', '/about');
    fireEvent.click(view.getByText('Next page'));
    expect(tag('robots').content).toContain('noindex');
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
    ).toBeNull();
  });
  it('preserves a failed server document noindex until the user leaves that route', () => {
    window.__ESTORA_PUBLIC__ = { pathname: '/properties', status: 503 };
    const view = mount('/properties', '/about');
    expect(tag('robots').content).toContain('noindex');
    expect(document.title).toContain('temporarily unavailable');
    fireEvent.click(view.getByText('Next page'));
    expect(tag('robots').content).not.toContain('noindex');
  });
  it('does not announce a pending property as a missing page', () => {
    mount('/properties/507f1f77bcf86cd799439011');
    expect(document.title).toBe('Loading property information | Estora');
    expect(tag('robots').content).toContain('noindex');
  });
  it('drops unverified image dimensions when a property photo replaces default artwork', () => {
    query.data = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Aurelia',
      city: 'Noida',
      status: 'LIVE',
      images: [{ url: 'https://images.example.com/building.webp' }],
    };
    const view = mount('/about', '/properties/507f1f77bcf86cd799439011');
    expect(tag('og:image:width')).not.toBeNull();
    fireEvent.click(view.getByText('Next page'));
    expect(tag('og:image:width')).toBeNull();
    expect(tag('og:image:height')).toBeNull();
    expect(tag('og:image').content).toContain('building.webp');
  });
});
