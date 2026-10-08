import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoDevelopment } from './seo-dev.mjs';
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const apiOrigin = environment.VITE_API_URL || 'http://localhost:5000';
  const origin = environment.VITE_SITE_URL || 'https://estora-pi.vercel.app';
  return {
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin), 'import.meta.env.VITE_SITE_URL': JSON.stringify(origin) },
    plugins: [react(), seoDevelopment({ apiOrigin, origin })],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
    },
    build: { chunkSizeWarningLimit: 1000 },
  };
});
