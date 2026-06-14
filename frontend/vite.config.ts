import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    host: '127.0.0.1',
    port: 7777,
    strictPort: true,
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },

  preview: {
    host: '127.0.0.1',
    port: 7778,
    strictPort: true,
  },
});