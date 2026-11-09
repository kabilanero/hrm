import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In dev the browser talks to Vite, which proxies /api to the Nest backend (no CORS setup needed).
  const backend = env.VITE_BACKEND_URL || 'http://localhost:3000';
  return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
    preview: { port: 5173, proxy: { '/api': { target: backend, changeOrigin: true } } },
  };
});
