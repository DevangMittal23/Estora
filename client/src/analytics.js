import { track } from '@vercel/analytics';

// URL parameters can contain emails, redirect targets or recovery credentials.
export function sanitizeAnalyticsEvent(event) {
  try {
    const url = new URL(event.url);
    if (/^\/(?:reset|reset-password)(?:\/|$)/.test(url.pathname)) {
      return null;
    }
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function trackSeoEvent(name, properties = {}) {
  if (!import.meta.env.PROD) return;
  const allowed = {
    calculator_used: ['calculator'],
    property_view: ['page'],
  };
  if (!allowed[name]) return;
  const safe = Object.fromEntries(allowed[name].filter((key) => typeof properties[key] === 'string').map((key) => [key, properties[key].slice(0, 80)]));
  track(name, safe);
}
