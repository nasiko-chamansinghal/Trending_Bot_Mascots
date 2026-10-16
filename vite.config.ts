import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  build: {
    rollupOptions: {
      input: {
        gallery: resolve(import.meta.dirname, 'index.html'),
        'mood-mates': resolve(import.meta.dirname, 'mood-mates/index.html'),
        'emotion-ball': resolve(import.meta.dirname, 'emotion-ball/index.html'),
        'ring-editor': resolve(import.meta.dirname, 'mood-mates/tools/ring-editor.html'),
      },
    },
  },
});
