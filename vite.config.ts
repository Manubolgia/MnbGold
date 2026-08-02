import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /**
   * GitHub Pages serves the board from /<repo>/, the Worker serves it from the
   * root. BASE_PATH is set to '/MnbGold/' by the Pages workflow and left unset
   * everywhere else.
   */
  base: process.env.BASE_PATH ?? '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
