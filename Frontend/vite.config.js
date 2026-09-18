import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Talk to the Express server without worrying about CORS in development.
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
