import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const target = process.env.LIB === 'emotion-ball' ? 'emotion-ball' : 'mood-mates';
const globalName = target === 'emotion-ball' ? 'EmotionBallLib' : 'MoodMatesLib';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, `src/engine/${target}/lib.ts`),
      name: globalName,
      formats: ['iife'],
      fileName: () => `${target}.iife.js`,
    },
  },
});
