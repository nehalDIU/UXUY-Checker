import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias to our custom icons to prevent ad blocker interference
      'lucide-react/dist/esm/icons/fingerprint.js': resolve(__dirname, './src/components/icons/CustomIcons.tsx'),
    },
  },
});
