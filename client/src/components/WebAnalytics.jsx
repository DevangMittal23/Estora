import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { sanitizeAnalyticsEvent } from '../analytics';

export function WebAnalytics() {
  // Local development and tests should not load or send visitor analytics.
  if (!import.meta.env.PROD) return null;
  return <Analytics mode="production" beforeSend={sanitizeAnalyticsEvent} />;
}
