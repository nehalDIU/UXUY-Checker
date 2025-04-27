import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Rename the path to avoid ad blocker detection
      '/icon-assets': {
        target: 'http://localhost:5175/node_modules/lucide-react/dist/esm/icons',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/icon-assets/, '')
      }
    }
  }
});
