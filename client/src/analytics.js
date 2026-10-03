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
