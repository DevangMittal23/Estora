import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { sanitizeAnalyticsEvent } from '../analytics';
import { WebAnalytics } from '../components/WebAnalytics';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  document
    .querySelectorAll('script[src*="/_vercel/insights/"]')
    .forEach((script) => script.remove());
  delete window.va;
  delete window.vaq;
  delete window.vam;
});

describe('analytics privacy', () => {
  it('removes query parameters and fragments while preserving the page', () => {
    const event = {
      type: 'pageview',
      url: 'https://estora-pi.vercel.app/properties?email=private@example.com&token=secret#private',
    };
    expect(sanitizeAnalyticsEvent(event)).toEqual({
      type: 'pageview',
      url: 'https://estora-pi.vercel.app/properties',
    });
    expect(event.url).toContain('token=secret');
  });

  it.each(['/reset/secret', '/reset-password/secret', '/reset/secret/extra'])(
    'excludes password recovery page %s',
    (path) => {
      expect(
        sanitizeAnalyticsEvent({
          type: 'pageview',
          url: `https://estora-pi.vercel.app${path}`,
        })
      ).toBeNull();
    }
  );

  it('preserves an ordinary property detail page', () => {
    const event = {
      type: 'pageview',
      url: 'https://estora-pi.vercel.app/properties/6ac0ff998d9f4517c0423965',
    };
    expect(sanitizeAnalyticsEvent(event)).toEqual(event);
  });

  it('discards malformed URLs', () => {
    expect(
      sanitizeAnalyticsEvent({ type: 'pageview', url: 'invalid URL' })
    ).toBeNull();
  });
});

describe('Vercel integration', () => {
  it('does not load the SDK script in development', () => {
    vi.stubEnv('PROD', false);
    render(<WebAnalytics />);
    expect(window.va).toBeUndefined();
    expect(
      document.querySelector('script[src*="/_vercel/insights/"]')
    ).toBeNull();
  });

  it('loads one production script with automatic page tracking and the privacy filter', () => {
    vi.stubEnv('PROD', true);
    render(
      <React.StrictMode>
        <WebAnalytics />
      </React.StrictMode>
    );
    const scripts = document.querySelectorAll(
      'script[src*="/_vercel/insights/"]'
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0].dataset.disableAutoTrack).toBeUndefined();
    const filter = window.vaq.find(([command]) => command === 'beforeSend')[1];
    expect(
      filter({
        type: 'pageview',
        url: 'https://estora-pi.vercel.app/reset/secret',
      })
    ).toBeNull();
    expect(window.vam).toBe('production');
  });
});
