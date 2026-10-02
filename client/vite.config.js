import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  const apiOrigin = environment.VITE_API_URL || 'http://localhost:5000';
  return {
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(apiOrigin) },
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
    },
    build: { chunkSizeWarningLimit: 1000 },
  };
});
