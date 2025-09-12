import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  root: '.', // ✅ current folder (Tulips_frontend)
  base: './',
  build: {
    outDir: 'dist', // ✅ dist folder outside
    emptyOutDir: true,
    rollupOptions: {
      input: './index.html', // ✅ relative to Tulips_frontend
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
  ],
  resolve: {
    alias: [
      {
        find: 'declarations',
        replacement: fileURLToPath(
          new URL('../declarations', import.meta.url)
        ),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
