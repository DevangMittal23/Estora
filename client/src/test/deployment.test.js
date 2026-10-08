import { describe, it, expect } from 'vitest';
import vercel from '../../vercel.json';

describe('Production public document routing', () => {
  it('renders the homepage before filesystem handling can serve the empty SPA entry', () => {
    const filesystem = vercel.routes.findIndex((route) => route.handle === 'filesystem');
    const homepage = vercel.routes.findIndex((route) => route.src === '/' && route.dest === '/api/seo?route=');
    expect(homepage).toBeGreaterThanOrEqual(0);
    expect(homepage).toBeLessThan(filesystem);
    expect(vercel.routes[0]).toMatchObject({ src: '/index\\.html', status: 308 });
    expect(vercel.routes.at(-1)).toMatchObject({ src: '/(.*)', dest: '/api/seo?route=$1' });
  });
});
